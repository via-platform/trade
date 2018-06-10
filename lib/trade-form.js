const {Disposable, CompositeDisposable, Emitter} = require('via');
const etch = require('etch');
const $ = etch.dom;
const _ = require('underscore-plus');

const ORDER_TYPES = {
    'market': 'Market Order',
    'limit': 'Limit Order',
    'stop-market': 'Stop Market Order',
    'stop-limit': 'Stop Limit Order',
};

module.exports = class TradeForm {
    constructor(order){
        this.order = order;
        this.disposables = new CompositeDisposable();
        etch.initialize(this);

        this.disposables.add(via.commands.add(this.element, 'trade:focus-next', this.focusNext.bind(this)));
        this.disposables.add(via.commands.add(this.element, 'trade:focus-previous', this.focusPrevious.bind(this)));
    
        this.disposables.add(this.order.onDidUpdateMarket(this.onDidChangeMarket.bind(this)));
    }

    focusNext(){
        const focused = document.activeElement;

        if(this.order.type === 'market') return;

        if(this.refs.amount === focused){
            this.order.type === 'limit' ? this.refs.limit.focus() : this.refs.stop.focus();
        }else if(this.refs.stop === focused){
            this.order.type === 'stop-limit' ? this.refs.limit.focus() : this.refs.amount.focus();
        }else if(this.refs.limit === focused){
            this.refs.amount.focus();
        }
    }

    focusPrevious(){
        const focused = document.activeElement;

        if(this.order.type === 'stop-limit'){
            if(this.refs.amount === focused) return this.refs.limit.focus();
            if(this.refs.stop === focused) return this.refs.amount.focus();
            if(this.refs.limit === focused) return this.refs.stop.focus();
        }else{
            this.focusNext();
        }
    }
    
    onDidChangeMarket(){
        this.order.type = this.order.market.exchange.config.orders[0] ;
    }

    render(){
        //TODO Disable the form while the order is transmitting
        return $.div({classList: 'trade-options native-key-bindings'},
            $.div({classList: 'trade-side btn-group'},
                $.button({classList: `btn buy ${this.order.side === 'buy' ? 'selected' : ''}`, ref: 'buy', onClick: () => this.order.side = 'buy'}, 'Buy'),
                $.button({classList: `btn sell ${this.order.side === 'sell' ? 'selected' : ''}`, ref: 'sell', onClick: () => this.order.side = 'sell'}, 'Sell')
            ),
            this.renderSelect(),
            this.renderFields()
        )
    }

    renderFields(){
        if(this.order.type === 'market'){
            return [
                this.renderAmounts()
            ];
        }else if(this.order.type === 'limit'){
            return [
                this.renderAmounts(),
                this.renderField('limit', 'quote', 'Limit Price')
            ];
        }else if(this.order.type === 'stop-market'){
            return [
                this.renderAmounts(),
                this.renderField('stop', 'quote', 'Stop Price')
            ];
        }else if(this.order.type === 'stop-limit'){
            return [
                this.renderAmounts(),
                this.renderField('stop', 'quote', 'Stop Price'),
                this.renderField('limit', 'quote', 'Limit Price')
            ];
        }else{
            return 'Error msg.';
        }
    }

    renderSelect(){
        const options = [$.option({value: '', disabled: true, selected: true}, 'Order Type')];

        for(const type of this.order.market.exchange.config.orders){
            options.push($.option({value: type}, ORDER_TYPES[type]));
        }

        return $.label({classList: 'input-label'},
            $.div({classList: 'title'}, 'Order Type'),
            $.select({classList: 'trade-type input-select', ref: 'type', value: this.order.type, onInput: () => this.order.type = this.refs.type.value}, options)
        );
    }

    renderAmounts(){
        return this.renderField('amount', 'base', 'Amount');
        // return $.div({classList: 'amounts input-unit'},
        //     $.div({classList: 'amount'}, this.renderField('amount', 'base', 'Amount'))//,
            // $.div({classList: 'amount-or'}, 'or'),
            // $.div({classList: 'amount'}, this.renderField('funds', 'quote', 'Funds'))
        // );
    }

    renderField(property, unit, label){
        const params = {
            classList: 'trade-field input-text',
            type: 'text',
            placeholder: '0.00',
            ref: property,
            onInput: this.didInput
        };

        if(this.order[property]) params.value = this.order[property];

        return [
            $.label({classList: 'input-label'},
                $.div({classList: 'title'}, label),
                $.div({classList: 'input-unit'},
                    $.div({classList: 'input-unit-label'}, this.order.market ? this.order.market[unit] : 'N/A'),
                    $.input(params)
                )
            )
        ];
    }

    didInput(){
        const amount = this.refs.amount ? parseFloat(this.refs.amount.value) : undefined;
        const funds = this.refs.funds ? parseFloat(this.refs.funds.value) : undefined;
        const limit = this.refs.limit ? parseFloat(this.refs.limit.value) : undefined;
        const stop = this.refs.stop ? parseFloat(this.refs.stop.value) : undefined;

        this.order.amount = (_.isNumber(amount) && !_.isNaN(amount)) ? amount : undefined;
        this.order.limit = (_.isNumber(limit) && !_.isNaN(limit)) ? limit : undefined;
        this.order.funds = (_.isNumber(funds) && !_.isNaN(funds)) ? funds : undefined;
        this.order.stop = (_.isNumber(stop) && !_.isNaN(stop)) ? stop : undefined;
    }

    update(order){
        this.order = order;
        etch.update(this);
    }

    destroy(){
        this.disposables.dispose();
        etch.destroy(this);
    }
}