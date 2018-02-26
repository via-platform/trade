const {Disposable, CompositeDisposable, Emitter} = require('via');
const etch = require('etch');
const $ = etch.dom;
const _ = require('underscore-plus');

module.exports = class TradeAccount {
    constructor(order){
        this.order = order;
        etch.initialize(this);
    }

    render(){
        return $.div({classList: 'trade-account'}, this.value('quote'), this.value('base'));
    }

    value(side){
        if(!this.order.market){
            return $.div({classList: 'balance'}, $.div({classList: 'currency'}, 'N/A'), $.div({classList: 'ff'}), $.div({classList: 'amount'}, '-'));
        }

        if(!this.order.account){
            return $.div({classList: 'balance'}, $.div({classList: 'currency'}, this.order.market[side]), $.div({classList: 'ff'}), $.div({classList: 'amount'}, '-'));
        }

        const value = this.order.account.getPosition(this.order.market[side]);
        const precision = this.order.market.precision.amount;

        return $.div({classList: 'balance'},
            $.div({classList: 'currency'}, this.order.market[side]),
            $.div({classList: 'ff'}),
            $.div({classList: 'amount'}, value ? value.free.toFixed(precision) : (0).toFixed(precision))
        );
    }

    update(order){
        this.order = order;
        etch.update(this);
    }

    destroy(){
        etch.destroy(this);
    }
}