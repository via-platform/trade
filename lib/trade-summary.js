const {Disposable, CompositeDisposable, Emitter} = require('via');
const etch = require('etch');
const $ = etch.dom;
const _ = require('underscore-plus');

module.exports = class TradeSummary {
    constructor({order, transmit, spot}){
        this.order = order;
        this.transmit = transmit;
        this.spot = spot;

        etch.initialize(this);
    }

    render(){
        const classes = ['trade-submit', this.order.side, this.order.status, this.order.isValidOrder() ? 'valid' : 'invalid'];

        return $.div({classList: 'trade-summary'},
            $.div({classList: 'trade-estimate'},
                $.div({}, `Estimated Total`),
                this.estimates()
            ),
            $.div({classList: classes.join(' ')},
                $.button({classList: 'btn btn-primary trade-execute', onClick: () => this.order.transmit()}, (this.order.side === 'buy') ? 'Place Buy Order' : 'Place Sell Order')//,
                // $.div({classList: 'spacer'}),
                // $.button({classList: 'btn trade-save', onClick: () => this.order.transmit()}, 'Save For Later')
            )
        );
    }

    estimates(){
        if(!this.order.market) return $.div({classList: 'estimates'}, 'N/A');

        let quote = 'N/A';
        const precision = this.order.market.precision.price;

        if(this.order.type === 'market'){
            quote = (this.order.amount * this.spot).toFixed(precision);
        }else if(this.order.type === 'stop-market'){
            quote = (this.order.stop && this.order.amount) ? (this.order.amount * this.order.stop).toFixed(precision) : 'N/A';
        }else if(this.order.type === 'limit' || this.order.type === 'stop-limit'){
            quote = (this.order.limit && this.order.amount) ? (this.order.amount * this.order.limit).toFixed(precision) : 'N/A';
        }

        return $.div({classList: 'estimates'},
            // $.span({}, this.order.amount ? this.order.amount : 'N/A'),
            // this.order.market.base,
            $.span({}, quote),
            this.order.market.quote
        );
    }

    update({order, transmit, spot}){
        this.order = order;
        this.transmit = transmit;
        this.spot = spot;

        etch.update(this);
    }
}