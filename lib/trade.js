const {Disposable, CompositeDisposable, Emitter} = require('via');
const base = 'via://trade';
const etch = require('etch');
const $ = etch.dom;
const _ = require('underscore-plus');
const TradeAccount = require('./trade-account');
const TradeForm = require('./trade-form');
const TradeSummary = require('./trade-summary');

module.exports = class TradeView {
    constructor(params = {}){
        this.emitter = new Emitter();
        this.uri = params.uri;
        this.omnibar = params.omnibar;
        this.spot = null;

        this.order = via.orders.create({
            market: via.markets.findByIdentifier(this.uri.slice(base.length + 1)),
            side: 'buy',
            type: 'market'
        });

        etch.initialize(this);
        this.bindOrderEvents();
    }

    render(){
        return $.div({classList: 'trade'},
            $.div({classList: 'trade-tools toolbar'},
                $.div({classList: 'market toolbar-button', onClick: this.change},
                    this.order.market ? this.order.market.title() : 'Select Market'
                ),
                $.div({classList: 'last-price', ref: 'last'}, '0.00')
            ),
            $.div({classList: 'trade-container'},
                $(TradeAccount, this.order),
                $(TradeForm, this.order),
                $(TradeSummary, {order: this.order, spot: this.spot})
            )
        );
    }

    update(){
        etch.update(this);
    }

    consumeOmnibar(omnibar){
        this.omnibar = omnibar;
    }

    save(){
        //Save the order to the orders panel and clear the fields here, but do not transmit it to the exchange
        this.reset();
    }

    change(){
        if(!this.omnibar) return console.error('Could not find omnibar.');

        this.omnibar.search({
            name: 'Change Market',
            placeholder: 'Enter a Market to Trade...',
            didConfirmSelection: market => this.order.market = market,
            maxResultsPerCategory: 30,
            items: via.markets.all()
        });
    }

    destroy(){
        via.orders.remove(this.order);

        if(this.marketDisposable) this.marketDisposable.dispose();
        if(this.accountDisposable) this.accountDisposable.dispose();

        this.emitter.emit('did-destroy');
        this.disposables.dispose();
        this.emitter.dispose();
    }

    getURI(){
        return this.uri;
    }

    getTitle(){
        return this.order.market ? `Trade ${this.order.market.title()}` : 'Trade';
    }

    updateSpotPrice({price}){
        this.spot = price;
        this.update();
    }

    bindOrderEvents(){
        if(this.disposables) this.disposables.dispose();
        this.disposables = new CompositeDisposable();

        this.disposables.add(this.order.onDidDestroy(this.reset.bind(this)));
        this.disposables.add(this.order.onDidUpdate(this.update.bind(this)));
        this.disposables.add(this.order.onDidUpdateAccount(this.didUpdateAccount.bind(this)));
        this.disposables.add(this.order.onDidUpdateMarket(this.didUpdateMarket.bind(this)));
        this.disposables.add(this.order.onWillTransmit(this.willTransmitOrder.bind(this)));
        this.disposables.add(this.order.onDidTransmit(this.didTransmitOrder.bind(this)));
        this.disposables.add(this.order.onDidTransmitError(this.update.bind(this)));

        this.didUpdateAccount();
        this.didUpdateMarket();
    }

    didUpdateAccount(){
        if(this.accountDisposable) this.accountDisposable.dispose();
        if(this.order.account) this.accountDisposable = this.order.account.onDidUpdatePosition(this.update.bind(this));
        this.update();
    }

    didUpdateMarket(){
        if(this.marketDisposable) this.marketDisposable.dispose();

        if(this.order.market && this.order.market.exchange.hasObserveTicker){
            const ticker = this.order.market.ticker();
            ticker.onDidUpdatePrice(this.updateSpotPrice.bind(this));
            this.marketDisposable = new Disposable(() => ticker.destroy());
        }

        this.update();
    }

    willTransmitOrder(){
        //Disable the form
        //Show a progress indication
        this.update();
    }

    didTransmitOrder(){
        //Show some fun success message
        this.reset();
    }

    reset(){
        this.order = via.orders.create({market: this.order.market, side: this.order.side, type: this.order.type});
        this.bindOrderEvents();
        this.update();
    }

    onDidChangeMarket(callback){
        return this.emitter.on('did-change-market', callback);
    }

    onDidDestroy(callback){
        return this.emitter.on('did-destroy', callback);
    }

    onDidChangeTitle(callback){
        return this.emitter.on('did-change-title', callback);
    }
}
