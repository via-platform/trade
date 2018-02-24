const {Disposable, CompositeDisposable, Emitter} = require('via');
const etch = require('etch');
const $ = etch.dom;
const _ = require('underscore-plus');

module.exports = class TradeForm {
    constructor(order){
        this.order = order;
        etch.initialize(this);
    }

    render(){
        //TODO Disable the form while the order is transmitting
        return $.div({classList: 'trade-options native-key-bindings'},
            $.div({classList: 'trade-side btn-group'},
                $.button({classList: `btn buy ${this.order.side === 'buy' ? 'selected' : ''}`, ref: 'buy', onClick: () => this.order.side = 'buy'}, 'Buy'),
                $.button({classList: `btn sell ${this.order.side === 'sell' ? 'selected' : ''}`, ref: 'sell', onClick: () => this.order.side = 'sell'}, 'Sell')
            ),
            $.div({classList: 'trade-label'}, 'Order Type'),
            $.select({classList: 'trade-type input-select', ref: 'type', value: this.order.type, onInput: () => this.order.type = this.refs.type.value},
                $.option({value: 'market'}, 'Market Order'),
                $.option({value: 'limit'}, 'Limit Order'),
                $.option({value: 'stop'}, 'Stop Order')
            )
        )
    }

    renderFields(){
        const fields = [];

        fields.push($.div({classList: 'trade-label'}, 'Amount'));

        if(this.order.type === 'market'){
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.order.market ? this.order.market.quote : 'N/A'),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'amount', onInput: this.didInput})
            ));
        }else if(this.order.type === 'limit'){
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.order.market ? this.order.market.base : 'N/A'),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'amount', onInput: this.didInput})
            ));

            fields.push($.div({classList: 'trade-label'}, 'Limit Price'));
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.order.market ? this.order.market.quote : 'N/A'),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'limit', onInput: this.didInput})
            ));
        }else if(this.order.type === 'stop'){
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.order.market ? this.order.market.quote : 'N/A'),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'amount', onInput: this.didInput})
            ));

            fields.push($.div({classList: 'trade-label'}, 'Stop Price'));
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.order.market ? this.order.market.quote : 'N/A'),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'stop', onInput: this.didInput})
            ));

            fields.push($.div({classList: 'trade-label'}, 'Limit Price (Optional)'));
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.order.market ? this.order.market.quote : 'N/A'),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'limit', onInput: this.didInput})
            ));
        }

        return fields;
    }

    didInput(){
        const amount = this.refs.amount ? parseFloat(this.refs.amount.value) : 0;
        const limit = this.refs.limit ? parseFloat(this.refs.limit.value) : 0;
        const stop = this.refs.stop ? parseFloat(this.refs.stop.value) : 0;

        this.order.amount = (_.isNumber(amount) && !_.isNaN(amount)) ? amount : 0;
        this.order.limit = (_.isNumber(limit) && !_.isNaN(limit)) ? limit : 0;
        this.order.stop = (_.isNumber(stop) && !_.isNaN(stop)) ? stop : 0;
    }

    update(order){
        this.order = order;
        etch.update(this);
    }
}