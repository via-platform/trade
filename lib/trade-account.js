const {Disposable, CompositeDisposable, Emitter} = require('via');
const etch = require('etch');
const $ = etch.dom;
const _ = require('underscore-plus');

module.exports = class TradeAccount {
    constructor(order){
        this.order = order;
        etch.initialize(this);
        this.watch();
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

        const value = this.order.account.getPosition(this.order.market[side]) || value;
        const precision = this.order.market.precision.amount;

        return $.div({classList: 'balance'},
            $.div({classList: 'currency'}, this.order.market[side]),
            $.div({classList: 'ff'}),
            $.div({classList: 'amount'}, value ? value.free.toFixed(precision) : (0).toFixed(precision))
        );
    }

    watch(){
        if(this.disposables) this.disposables.dispose();

        this.disposables = new CompositeDisposable(
            this.order.onDidUpdateAccount(this.watch.bind(this)),
            this.order.onDidUpdateMarket(() => etch.update(this))
        );

        if(this.order.account){
            this.disposables.add(this.order.account.onDidUpdatePosition(() => etch.update(this)));
        }

        etch.update(this);
    }

    update(order){
        if(order && this.order !== order){
            this.order = order;
            this.watch();
        }

        etch.update(this);
    }

    destroy(){
        this.disposables.dispose();
        etch.destroy(this);
    }
}