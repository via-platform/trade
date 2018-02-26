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
        let currency;

        if(this.order.market){
            currency = this.order.type === 'limit' ? this.order.market.quote : this.order.market.base
        }else{
            currency = 'N/A';
        }

        let estimate = 'N/A';

        if(this.order.market){
            if(this.order.type === 'limit'){
                estimate = (this.order.amount * this.order.limit).toFixed(this.order.market.precision.price);
            }else if(this.order.type === 'market'){
                estimate = (this.order.amount / this.spot).toFixed(this.order.market.precision.amount);
            }else if(this.order.type === 'stop'){
                estimate = this.order.limit ? (this.order.amount / this.order.limit).toFixed(this.order.market.precision.price) : 'N/A';
            }
        }

        const classes = ['trade-execute', this.order.side, this.order.status, this.order.isValidOrder() ? 'valid' : 'invalid'];
        const message = (this.order.status === 'transmitting') ? 'Transmitting...' : (this.order.side === 'buy') ? 'Place Buy Order' : 'Place Sell Order';

        return $.div({classList: 'trade-summary'},
            $.div({classList: 'trade-estimate'},
                $.div({}, `Total (${currency}) ≈`),
                $.div({classList: 'estimate', ref: 'estimate'}, estimate)
            ),
            $.button({classList: classes.join(' '), onClick: () => this.order.transmit()}, message)
        );
    }

    update({order, transmit, spot}){
        this.order = order;
        this.transmit = transmit;
        this.spot = spot;

        etch.update(this);
    }
}