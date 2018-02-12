const {Disposable, CompositeDisposable, Emitter} = require('via');
const base = 'via://trade';
const etch = require('etch');
const $ = etch.dom;

module.exports = class TradeView {
    static deserialize(params){
        return new TradeView(params);
    }

    serialize(){
        return {
            uri: this.uri,
            side: this.side,
            type: this.type
        };
    }

    constructor(params = {}){
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.uri = params.uri;
        this.omnibar = params.omnibar;
        this.side = params.side || 'buy';
        this.type = params.type || 'market';
        this.market = null;
        this.account = null;
        this.spot = null;

        this.amount = '';
        this.limit = '';
        this.stop = '';

        etch.initialize(this);
        this.changeMarket(via.markets.findByIdentifier(this.uri.slice(base.length + 1)));

        this.disposables.add(via.accounts.onDidAddAccount(this.locateTradingAccount.bind(this)));
    }

    render(){
        return $.div({classList: 'trade'},
            $.div({classList: 'trade-tools toolbar'},
                $.div({classList: 'market btn btn-subtle', onClick: this.change},
                    this.market ? this.market.title() : 'Select Market'
                ),
                $.div({classList: 'last-price', ref: 'last'}, '0.00')
            ),
            this.renderAccountBalances(),
            $.form({classList: 'trade-options native-key-bindings', onSubmit: this.transmit},
                $.div({classList: 'trade-side btn-group'},
                    $.button({classList: 'btn'}, 'Buy'),
                    $.button({classList: 'btn'}, 'Sell')
                ),
                $.div({classList: 'trade-label'}, 'Order Type'),
                $.select({classList: 'trade-type input-select', ref: 'type', onInput: this.changeType},
                    $.option({value: 'market', selected: this.type === 'market'}, 'Market Order'),
                    $.option({value: 'limit', selected: this.type === 'limit'}, 'Limit Order'),
                    $.option({value: 'stop', selected: this.type === 'stop'}, 'Stop Order')
                ),
                this.renderFields(),
                this.renderSummary(),
                $.button({classList: 'trade-execute btn btn-large btn-info ' + this.side, onClick: this.transmit}, this.side === 'buy' ? 'Place Buy Order' : 'Place Sell Order')
            )
        );
    }

    renderAccountBalances(){
        if(!this.account || !this.market) return '';

        const base = this.account.getPosition(this.market.base);
        const quote = this.account.getPosition(this.market.quote);

        return $.div({classList: 'trade-account'},
            $.div({classList: 'trade-label'}, 'Balances (Free)'),
            $.div({classList: 'balance'},
                $.div({classList: 'currency'}, this.market.quote),
                $.div({classList: 'ff'}),
                $.div({classList: 'amount'}, quote.free.toFixed(this.market.precision.price))
            ),
            $.div({classList: 'balance'},
                $.div({classList: 'currency'}, this.market.base),
                $.div({classList: 'ff'}),
                $.div({classList: 'amount'}, base.free.toFixed(this.market.precision.amount))
            )
        );
    }

    renderFields(){
        if(!this.market) return '';

        const fields = [];

        fields.push($.div({classList: 'trade-label'}, 'Amount'));

        if(this.type === 'market'){
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.market.quote),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'amount'})
            ));
        }else if(this.type === 'limit'){
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.market.base),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'amount'})
            ));

            fields.push($.div({classList: 'trade-label'}, 'Limit Price'));
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.market.quote),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'limit'})
            ));
        }else if(this.type === 'stop'){
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.market.quote),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'amount'})
            ));

            fields.push($.div({classList: 'trade-label'}, 'Stop Price'));
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.market.quote),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'stop'})
            ));

            fields.push($.div({classList: 'trade-label'}, 'Limit Price (Optional)'));
            fields.push($.div({classList: 'input-unit'},
                $.div({classList: 'input-unit-label'}, this.market.quote),
                $.input({classList: 'trade-field input-text', type: 'text', placeholder: '0.00', ref: 'limit'})
            ));
        }

        return fields;
    }

    renderSummary(){
        if(!this.market) return '';

        return $.div({classList: 'trade-summary'},
            $.div({}, `Total (${this.type === 'limit' ? this.market.quote : this.market.base}) ≈`),
            $.div({classList: 'estimate', ref: 'estimate'}, '0.00')
        );
    }

    changeType(){
        console.log('New Type: ' + this.refs.type.value);
        this.type = this.refs.type.value;
        this.update();
    }

    update(){
        etch.update(this);
    }

    consumeOmnibar(omnibar){
        this.omnibar = omnibar;
    }

    save(){
        //TODO Save the order to the orders panel, but do not transmit it to the exchange
    }

    transmit(){
        if(!this.market){
            return;
        }

        const currency = (this.type === 'limit') ? this.market.base : this.market.quote;
        const amount = parseFloat(this.refs.amount.value);
        let limit, stop;

        if(!amount || isNaN(amount)){
            return;
        }

        let detail = `Place a ${this.type} order to ${this.side.toUpperCase()} ${amount} ${currency}`;

        if(this.type === 'limit'){
            limit = parseFloat(this.refs.limit.value);
            if(!limit || isNaN(limit)){
                return;
            }

            detail += ` at a limit price of ${limit} ${this.market.quote}?`;
        }else if(this.type === 'stop'){
            stop = parseFloat(this.refs.stop.value);
            limit = parseFloat(this.refs.limit.value);
            if(!stop || isNaN(stop)){
                return;
            }

            if(limit && isNaN(limit)){
                return;
            }

            detail += ` worth of ${this.market.base} with a stop price of ${stop} ${this.market.quote}`;
            detail += (limit && !isNaN(limit)) ? ` and a limit price of ${limit} ${this.market.quote}?` : `?`;
        }else if(this.type === 'market'){
            detail += ` worth of ${this.market.base}?`;
        }

        //TODO Warn the user if there is a chance their order may be rejected due to insufficient funds
        via.confirm({
            message: 'Order Confirmation',
            detail,
            buttons: ['Cancel', 'Confirm'],
            defaultId: 1,
            cancelId: 0
        }, result => {
            if(result){
                console.log('Confirmed');
                console.log(result);
                via.orders.create(this.market, {type: this.type, side: this.side, size: amount, limit, stop, transmit: true});
            }
        });
    }

    change(){
        if(this.omnibar){
            this.omnibar.search({
                name: 'Change Market',
                placeholder: 'Enter a Market to Trade...',
                didConfirmSelection: this.changeMarket.bind(this),
                maxResultsPerCategory: 30,
                items: via.markets.all()
            });
        }else{
            console.error('Could not find omnibar.');
        }
    }

    destroy(){
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
        return this.market ? `Trade ${this.market.name}` : 'Trade';
    }

    updateSpotPrice({price}){
        if(price){
            this.spot = price;
        }

        this.refs.last.textContent = `${this.spot.toFixed(this.market.precision.price)} ${this.market.quote}`;
    }

    changeMarket(market = null){
        if(this.market === market) return;

        if(this.marketDisposable){
            this.marketDisposable.dispose();
        }

        this.market = market;

        if(this.market){
            this.marketDisposable = new CompositeDisposable(this.market.onDidDestroy(() => this.changeMarket()));

            const ticker = this.market.ticker();

            if(ticker){
                ticker.onDidUpdatePrice(this.updateSpotPrice.bind(this));
                this.marketDisposable.add(new Disposable(() => ticker.destroy()));
            }
        }

        this.clearTradingAccount();
        this.locateTradingAccount();

        etch.update(this);

        this.emitter.emit('did-change-market', market);
        this.emitter.emit('did-change-title');
    }

    clearTradingAccount(){
        if(this.accountDisposable){
            this.accountDisposable.dispose();
        }

        this.account = null;
    }

    locateTradingAccount(){
        if(this.account || !this.market) return;

        //Find the appropriate account to execute trades for this market
        const account = via.accounts.activeAccountForExchange(this.market.exchange);

        if(account){
            this.account = account;

            this.accountDisposable = new CompositeDisposable(
                this.account.onDidDeactivate(() => {
                    this.clearTradingAccount();
                    this.locateTradingAccount();
                }),
                this.account.onDidUpdatePosition(() => etch.update(this))
            );
        }
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
