const {Disposable, CompositeDisposable, Emitter} = require('via');
const base = 'via://trade';
const etch = require('etch');
const $ = etch.dom;
const _ = require('underscore-plus');
const TradeAccount = require('./trade-account');
const TradeForm = require('./trade-form');
const TradeSummary = require('./trade-summary');

module.exports = class TradeView {
    static deserialize({omnibar}, state){
        return new TradeView({omnibar}, state);
    }

    constructor({omnibar}, state = {}){
        this.emitter = new Emitter();
        this.uri = state.uri;
        this.omnibar = omnibar;
        this.subscriptions = new CompositeDisposable();
        this.order = via.orders.create({side: 'buy', type: 'market'});

        etch.initialize(this);
        this.subscriptions.add(via.commands.add(this.element, 'trade:change-market', this.change.bind(this)));
        this.bindOrderEvents();

        this.initialize(state);
    }

    async initialize(state){
        await via.markets.initialize();

        const [method, id] = this.uri.slice(base.length + 1).split('/');

        if(method === 'market'){
            const market = via.markets.uri(id);
            this.changeMarket(market);
        }
    }

    serialize(){
        return {
            deserializer: 'Trade',
            uri: this.getURI()
        };
    }

    render(){
        return $.div({classList: 'trade', tabIndex: -1},
            $.div({classList: 'trade-tools toolbar'},
                $.div({classList: 'market toolbar-button', onClick: this.change},
                    this.order.market ? this.order.market.title : 'Select Market'
                )
            ),
            this.tradeContainer()
        );
    }

    tradeContainer(){
        if(this.order.market){
            if(this.order.market.exchange.config.trading){
                return $.div({classList: 'trade-container'},
                    $(TradeAccount, this.order),
                    $(TradeForm, this.order),
                    $(TradeSummary, {order: this.order, spot: this.order.market ? this.order.market.ticker.last() : 0})
                )
            }else{
                return $.div({classList: 'panel-empty'}, $.div({classList: 'message'}, 'Trading is not yet supported on this market. Stay tuned.'));
            }
        }else{
            return $.div({classList: 'panel-empty'}, $.div({classList: 'message'}, 'Please select a market to trade.'), $('kbd', {}, 'M'));
        }
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
            didConfirmSelection: this.changeMarket.bind(this),
            maxResultsPerCategory: 60,
            items: via.markets.all()
        });
    }

    changeMarket(market){
        this.order.market = market;
        this.order.limit = 0 ;
        this.emitter.emit('did-change-title');
    }

    destroy(){
        if(this.ticker) this.ticker.dispose();
        if(this.accountDisposable) this.accountDisposable.dispose();
        if(this.disposables) this.disposables.dispose();

        this.order.destroy();
        this.subscriptions.dispose();
        this.emitter.emit('did-destroy');
        this.emitter.dispose();
    }

    getURI(){
        return this.order.market ? `${base}/market/${this.order.market.uri()}` : base;
    }

    getTitle(){
        return this.order.market ? `Trade ${this.order.market.title}` : 'Trade';
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
        if(this.ticker) this.ticker.dispose();

        if(this.order.market){
            this.ticker = this.order.market.ticker.subscribe(this.update.bind(this));
        }

        this.update();
        this.emitter.emit('did-change-market', this.order.market);
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

    getMarket(){
        return this.order.market;
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
