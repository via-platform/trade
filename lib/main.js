const {CompositeDisposable, Disposable} = require('via');
const base = 'via://trade';

const TradeView = require('./trade');

const InterfaceConfiguration = {
    name: 'Trade',
    description: 'Create and execute new orders for the specified symbol.',
    command: 'trade:create-trade',
    uri: base
};

class TradePackage {
    constructor(){
        this.trades = [];
    }

    activate(){
        this.disposables = new CompositeDisposable();

        this.disposables.add(via.commands.add('via-workspace, .symbol-explorer .market', 'trade:create-trade', this.create.bind(this)));

        this.disposables.add(via.workspace.addOpener((uri, options) => {
            if(uri === base || uri.startsWith(base + '/')){
                const trade = new TradeView({uri, omnibar: this.omnibar});
                this.trades.push(trade);
                return trade;
            }
        }, InterfaceConfiguration));
    }

    deserialize(state){
        const trade = TradeView.deserialize(state);
        this.trades.push(trade);
        return trade;
    }

    create(e){
        e.stopPropagation();

        if(e.currentTarget.classList.contains('market')){
            const market = e.currentTarget.getMarket();
            via.workspace.open(`${base}/${market.exchange.id}/${market.symbol}`, {});
        }else{
            via.workspace.open(base);
        }
    }

    consumeActionBar(actionBar){
        this.omnibar = actionBar.omnibar;

        for(const trade of this.trades){
            trade.consumeOmnibar(this.omnibar);
        }
    }

    deactivate(){
        this.disposables.dispose();
        this.disposables = null;
    }
}

module.exports = new TradePackage();
