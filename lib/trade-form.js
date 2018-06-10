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
    }

    focusNext(){
        const focused = document.activeElement;

        if(this.order.type === 'market') return;

        if(this.refs.amount === focused){
            this.order.type === 'limit' ? this.refs.limit.focus() : this.refs.stop.focus();
        }else if(this.refs.stop === focused){
            this.order.type === 'stop-limit' ? this.refs.limit.focus() : this.refs.total.focus();
        }else if(this.refs.limit === focused){
            this.refs.total.focus();
        }else if(this.refs.total === focused){
            this.refs.amount.focus();
        }
    }

    focusPrevious(){
        const focused = document.activeElement;

        if(this.order.type === 'stop-limit'){
            if(this.refs.amount === focused) return this.refs.total.focus();
            if(this.refs.stop === focused) return this.refs.amount.focus();
            if(this.refs.limit === focused) return this.refs.stop.focus();
            if(this.refs.total === focused) return this.refs.limit.focus();
        }else if(this.order.type === 'limit'){
            if(this.refs.amount === focused) return this.refs.total.focus();
            if(this.refs.limit === focused) return this.refs.amount.focus();
            if(this.refs.total === focused) return this.refs.limit.focus();
        }{
            this.focusNext();
        }
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
                this.renderField('limit', 'quote', 'Limit Price'),
                this.renderPricePrefillButtons(),
                this.renderField('total', 'quote', 'Estimated total')
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
                this.renderField('limit', 'quote', 'Limit Price'),
                this.renderPricePrefillButtons(),
                this.renderField('total', 'quote', 'Estimated total')
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
    
    renderPricePrefillButtons(){
        return $.div({classList: 'trade-side btn-group'},
            $.button({classList: `btn last ${this.order.side === 'last' ? 'selected' : ''}`, ref: 'buy', onClick: () => this.order.limit = this.order.market.ticker.last().toFixed(this.order.market.precision.price)}, 'Last'),
            $.button({classList: `btn bid ${this.order.side === 'bid' ? 'selected' : ''}`, ref: 'bid', onClick: () => this.order.limit = this.order.market.quotes.last().bid.price.toFixed(this.order.market.precision.price)}, 'Bid'),
            $.button({classList: `btn ask ${this.order.side === 'ask' ? 'selected' : ''}`, ref: 'ask', onClick: () => this.order.limit = this.order.market.quotes.last().ask.price.toFixed(this.order.market.precision.price)}, 'Ask')
        )
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
            onInput: this.didInput,
            dataset: {
                ref : property
            }
        };

        if(this.order[property]) params.value = this.order[property];
        
        if(property === 'limit' || property === 'stop') {
            params.onFocus = this.didFocusLimit ;
        }

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

    didInput(e){
        const amount = this.refs.amount ? parseFloat(this.refs.amount.value) : undefined;
        const funds = this.refs.funds ? parseFloat(this.refs.funds.value) : undefined;
        const limit = this.refs.limit ? parseFloat(this.refs.limit.value) : undefined;
        const stop = this.refs.stop ? parseFloat(this.refs.stop.value) : undefined;
        const total = this.refs.total ? parseFloat(this.refs.total.value) : undefined;
        
        this.order.amount = (_.isNumber(amount) && !_.isNaN(amount)) ? amount : undefined;
        this.order.limit = (_.isNumber(limit) && !_.isNaN(limit)) ? limit : undefined;
        this.order.funds = (_.isNumber(funds) && !_.isNaN(funds)) ? funds : undefined;
        this.order.stop = (_.isNumber(stop) && !_.isNaN(stop)) ? stop : undefined;
        this.order.total = (_.isNumber(total) && !_.isNaN(total)) ? total : undefined;
        
        if(this.order.limit)
        {
            if(e.target.dataset.ref === 'total')
            {
                this.order.amount = (_.isNumber(total) && !_.isNaN(total)) && (_.isNumber(limit) && !_.isNaN(limit)) ? total / limit : undefined;
            }
            else if (e.target.dataset.ref === 'amount' || e.target.dataset.ref === 'limit')
            {
                this.order.total = (_.isNumber(amount) && !_.isNaN(amount)) && (_.isNumber(limit) && !_.isNaN(limit)) ? amount * limit : undefined;
            }
        }
    }
    
    didFocusLimit() {
        if(this.order.limit === 0)
        {
            this.order.limit = this.order.market.ticker.last() ;
        }
        if(this.order.stop === 0)
        {
            this.order.stop = this.order.market.ticker.last() ;
        }
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