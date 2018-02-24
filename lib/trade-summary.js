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

        // if(this.spot){
        //     this.refs.last.textContent = `≈ ${this.spot.toFixed(this.order.market.precision.price)} ${this.order.market.quote}`;
        //     this.updateEstimate();
        // }
        //
        // if(!this.spot || !_.isNumber(this.spot)) return;
        //
        // let estimate;
        //
        // if(this.order.type === 'limit'){
        //     estimate = (this.order.amount * this.order.limit).toFixed(this.order.market.precision.price);
        // }else if(this.order.type === 'market'){
        //     estimate = (this.order.amount / this.spot).toFixed(this.order.market.precision.amount);
        // }else if(this.order.type === 'stop'){
        //     estimate = this.order.limit ? (this.order.amount / this.order.limit).toFixed(this.order.market.precision.price) : 'N/A';
        // }
        //
        // this.refs.estimate.textContent = estimate;

        //TODO change the state of the button depending on the order status
        //TODO disable the button when the order is invalid

        return $.div({classList: 'trade-summary'},
            $.div({classList: 'trade-estimate'},
                $.div({}, `Total (${currency}) ≈`),
                $.div({classList: 'estimate', ref: 'estimate'}, 'N/A')
            ),
            $.button({classList: 'trade-execute btn btn-large btn-info ' + this.order.side, onClick: this.transmit}, this.order.side === 'buy' ? 'Place Buy Order' : 'Place Sell Order')
        );
    }

    update({order, transmit, spot}){
        this.order = order;
        this.transmit = transmit;
        this.spot = spot;

        etch.update(this);
    }
}