const AST_OPERATORS = {
    '*': a => a[0] * a[1],
    '/': a => a[0] / a[1],
    '+': a => a[0] + a[1],
    '-': a => a[0] - a[1],
    '>': a => a[0] > a[1],
    '<': a => a[0] < a[1],
    '==': a => a[0] == a[1],
    '>=': a => a[0] >= a[1],
    '<=': a => a[0] <= a[1],
    '||': a => a[0] || a[1],
    '&&': a => a[0] && a[1],
    '?': a => a[0] ? a[1] : a[2],
    'u-': a => -a[0],
    's': a => a[0],
    '!': a => a[0] ? false : true,
    '[': a => typeof(a[0]) == 'object' ? a[0][a[1]] : undefined
};

const AST_FUNCTIONS = {
    'trunc': (a) => Math.trunc(a[0]),
    'ceil': (a) => Math.ceil(a[0]),
    'floor': (a) => Math.floor(a[0]),
    'datetime': (a) => formatDate(a[0]),
    'number': (a) => Number.isInteger(a[0]) ? a[0] : a[0].toFixed(2),
    'duration': (a) => formatDuration(a[0]),
    'date': (a) => formatDateOnly(a[0]),
    'fnumber': (a) => formatAsSpacedNumber(a[0]),
    'small': (a) => CellGenerator.Small(a[0]),
    'min': (a) => Array.isArray(a[0]) ? Math.min(... a[0]) : Math.min(... a),
    'max': (a) => Array.isArray(a[0]) ? Math.max(... a[0]) : Math.max(... a),
    'sum': (a) => Array.isArray(a[0]) ? a[0].reduce((t, a) => t + a, 0) : a.reduce((t, a) => t + a, 0)
};

class AST {
    constructor (string) {
        this.tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(/(\'[^\']*\'|\"[^\"]*\"|\|\||\!|\&\&|\>\=|\<\=|\=\=|\(|\)|\+|\-|\/|\*|\>|\<|\?|\:|\[|\]|\,)/).map(token => token.trim()).filter(token => token.length);
        this.root = this.evalExpression();
    }

    peek (i) {
        return this.tokens[i || 0];
    }

    get () {
        var v = this.tokens.shift();
        return isNaN(v) ? v : Number(v);
    }

    getRoot () {
        return this.root;
    }

    getVal () {
        var val = this.get();
        if (val[0] == '\"' || val[0] == '\'') {
            val = {
                args: [ val.slice(1, val.length - 1).replace(/\u2023/g, '\"').replace(/\u2043/g, '\'') ],
                op: AST_OPERATORS['s'],
                noeval: true
            }
        } else if (val == '-') {
            var v;
            if (this.peek() == '(') {
                v = this.evalBracketExpression();
            } else if (AST_FUNCTIONS[this.peek()] || (/\w+/.test(this.peek()) && this.peek(1) == '(')) {
                v = this.getVal();
            } else {
                v = this.get();
            }

            val = {
                args: [ v ],
                op: AST_OPERATORS['u-']
            };
        } else if (val == '!') {
            var v;
            if (this.peek() == '(') {
                v = this.evalBracketExpression();
            } else if (AST_FUNCTIONS[this.peek()] || (/\w+/.test(this.peek()) && this.peek(1) == '(')) {
                v = this.getVal();
            } else {
                v = this.get();
            }

            val = {
                args: [ v ],
                op: AST_OPERATORS['!']
            };
        } else if (AST_FUNCTIONS[val] || (/\w+/.test(val) && this.peek() == '(')) {
            var a = [];
            this.get();

            a.push(this.evalExpression());
            while (this.peek() == ',') {
                this.get();

                a.push(this.evalExpression());
            }

            this.get();
            val = {
                args: a,
                op: AST_FUNCTIONS[val] ? AST_FUNCTIONS[val] : val
            };
        }

        while (this.peek() == '[') {
            this.get();

            val = {
                args: [ val, this.evalExpression() ],
                op: AST_OPERATORS['[']
            };

            this.get();
        }

        return val;
    }

    evalBracketExpression () {
        this.get();
        var v = this.evalExpression();
        this.get();
        return v;
    }

    evalRankedExpression () {
        var left, right, op;
        if (this.peek() == '(') {
            left = this.evalBracketExpression();
        } else {
            left = this.getVal();
        }

        while (['*', '/'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.getVal();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalSimpleExpression () {
        var left, right, op;

        left = this.evalRankedExpression();

        while (['+', '-'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalRankedExpression();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalBoolExpression () {
        var left, right, op;

        left = this.evalSimpleExpression();

        while (['>', '<', '<=', '>=', '=='].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalSimpleExpression();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalBoolMergeExpression () {
        var left, right, op;

        left = this.evalBoolExpression();

        while (['||', '&&'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalBoolExpression();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalExpression () {
        var left, tr, fl;

        left = this.evalBoolMergeExpression();

        if (this.peek() == '?') {
            this.get();

            if (this.peek() == '(') {
                tr = this.evalBracketExpression();
            } else {
                tr = this.evalBoolMergeExpression();
            }

            if (this.peek() == ':') {
                this.get();

                if (this.peek() == '(') {
                    fl = this.evalBracketExpression();
                } else {
                    fl = this.evalBoolMergeExpression();
                }

                left = {
                    args: [ left, tr, fl ],
                    op: AST_OPERATORS['?']
                }
            }
        }

        return left;
    }

    isValid () {
        return this.tokens.length == 0;
    }

    eval (player, environment = { func: { }, vars: { } }, scope = undefined, node = this.root) {
        if (typeof(node) == 'object') {
            if (node.noeval) {
                return node.args[0];
            } else if (typeof(node.op) == 'string') {
                if (node.op == 'each' && node.args.length >= 2) {
                    var object = Object.values(this.eval(player, environment, scope, node.args[0]) || {});
                    var mapper = environment.func[node.args[1]];
                    var sum = 0;
                    if (mapper) {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            for (var j = 0; j < mapper.arg.length; j++) {
                                scope2[mapper.arg[j]] = object[i];
                            }
                            sum += mapper.ast.eval(player, environment, scope2);
                        }
                    } else {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            scope2[node.args[1].split('.', 1)[0]] = object[i];
                            sum += this.eval(player, environment, scope2, node.args[1]);
                        }
                    }
                    return sum;
                } else if (node.op == 'map' && node.args.length >= 2) {
                    var object = Object.values(this.eval(player, environment, scope, node.args[0]) || {});
                    var mapper = environment.func[node.args[1]];
                    var sum = [];
                    if (mapper) {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            for (var j = 0; j < mapper.arg.length; j++) {
                                scope2[mapper.arg[j]] = object[i];
                            }
                            sum.push(mapper.ast.eval(player, environment, scope2));
                        }
                    } else {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            scope2[node.args[1].split('.', 1)[0]] = object[i];
                            sum.push(this.eval(player, environment, scope2, node.args[1]));
                        }
                    }
                    return sum;
                } else if (node.op == 'slice' && node.args.length >= 3) {
                    return Object.values(this.eval(player, environment, scope, node.args[0])).slice(Number(node.args[1]), Number(node.args[2]));
                } else if (environment.func[node.op]) {
                    var mapper = environment.func[node.op];
                    var scope2 = {};
                    for (var i = 0; i < mapper.arg.length; i++) {
                        scope2[mapper.arg[i]] = this.eval(player, environment, scope, node.args[i]);
                    }
                    return mapper.ast.eval(player, environment, scope2);
                } else {
                    return undefined;
                }
            } else if (node.op) {
                return node.op(node.args.map(arg => this.eval(player, environment, scope, arg)));
            } else {
                return node;
            }
        } else if (typeof(node) == 'string') {
            if (node == 'this') {
                // Return current scope
                return scope;
            } else if (node == 'undefined') {
                // Return undefined
                return undefined;
            } else if (node == 'null') {
                // Return nulll
                return null;
            } else if (typeof(scope) == 'object' && (scope[node] || scope[node.split('.', 1)[0]])) {
                // Return scope variable
                if (scope[node]) {
                    return scope[node];
                } else {
                    var [key, path] = node.split(/\.(.*)/, 2);
                    return getObjectAt(scope[key], path);
                }
            } else if (environment.vars[node]) {
                // Return variable
                if (environment.vars[node].value != undefined) {
                    return environment.vars[node].value;
                } else if (environment.vars[node].ast) {
                    return environment.vars[node].ast.eval(player, environment);
                } else {
                    return undefined;
                }
            } else if (node[0] == '@') {
                return Constants.Values[node.slice(1)];
            } else if (SP_KEYWORD_MAPPING_0[node] && player) {
                return SP_KEYWORD_MAPPING_0[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_1[node] && player) {
                return SP_KEYWORD_MAPPING_1[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_2[node] && player) {
                return SP_KEYWORD_MAPPING_2[node].expr(player);
            } else {
                return getObjectAt(player, node);
            }
        } else {
            return node;
        }
    }
}

const SP_KEYWORD_MAPPING_0 = {
    'ID': {
        expr: p => p.ID
    },
    'Role': {
        expr: p => p.Group.Role,
        flip: true,
        format: (p, x) => p.hasGuild() ? '?' : GROUP_ROLES[cell.Group.Role]
    },
    'Level': {
        expr: p => p.Level
    },
    'Guild': {
        expr: p => p.Group.Name || ''
    },
    'Strength': {
        expr: p => p.Strength.Total
    },
    'Dexterity': {
        expr: p => p.Dexterity.Total
    },
    'Intelligence': {
        expr: p => p.Intelligence.Total
    },
    'Constitution': {
        expr: p => p.Constitution.Total
    },
    'Luck': {
        expr: p => p.Luck.Total
    },
    'Attribute': {
        expr: p => p.Primary.Total
    },
    'Strength Bonus': {
        expr: p => p.Strength.Bonus,
        alias: 'Str Bonus'
    },
    'Dexterity Bonus': {
        expr: p => p.Dexterity.Bonus,
        alias: 'Dex Bonus'
    },
    'Intelligence Bonus': {
        expr: p => p.Intelligence.Bonus,
        alias: 'Int Bonus'
    },
    'Constitution Bonus': {
        expr: p => p.Constitution.Bonus,
        alias: 'Con Bonus'
    },
    'Luck Bonus': {
        expr: p => p.Luck.Bonus,
        alias: 'Lck Bonus'
    },
    'Bonus': {
        expr: p => p.Primary.Bonus
    },
    'Base Strength': {
        expr: p => p.Strength.Base
    },
    'Base Dexterity': {
        expr: p => p.Dexterity.Base
    },
    'Base Intelligence': {
        expr: p => p.Intelligence.Base
    },
    'Base Constitution': {
        expr: p => p.Constitution.Base
    },
    'Base Luck': {
        expr: p => p.Luck.Base
    },
    'Base': {
        expr: p => p.Primary.Base
    },
    'Honor': {
        expr: p => p.Honor
    },
    'Runes': {
        expr: p => p.Runes.Runes,
        format: (p, x) => `e${ x }`,
        width: 100
    },
    'Action Index': {
        expr: p => p.Action.Index
    },
    'Status': {
        expr: p => p.Action.Status,
        format: (p, x) => PLAYER_ACTIONS[Math.max(0, x)]
    },
    'Action Finish': {
        expr: p => p.Action.Finish,
        format: (p, x) => x < 0 ? formatDate(x) : ''
    },
    'Health': {
        expr: p => p.Health,
        width: 120
    },
    'Armor': {
        expr: p => p.Armor
    },
    'Space': {
        expr: p => 5 + p.Fortress.Treasury
    },
    'Mirror': {
        expr: p => p.Mirror ? 13 : p.MirrorPieces
    },
    'Equipment': {
        expr: p => Object.values(p.Items).reduce((c, i) => c + (i.Attributes[0] > 0 ? i.getItemLevel() : 0), 0),
        width: 130
    },
    'Tower': {
        expr: p => p.Dungeons.Tower
    },
    'Portal': {
        expr: p => p.Dungeons.Player
    },
    'Guild Portal': {
        expr: p => p.Dungeons.Group,
        width: 130
    },
    'Dungeon': {
        expr: p => p.Dungeons.Normal.Total
    },
    'Shadow Dungeon': {
        expr: p => p.Dungeons.Shadow.Total
    },
    'Fortress': {
        expr: p => p.Fortress.Fortress
    },
    'Upgrades': {
        expr: p => p.Fortress.Upgrades
    },
    'Gem Mine': {
        expr: p => p.Fortress.GemMine
    },
    'Fortress Honor': {
        expr: p => p.Fortress.Honor,
        width: 130
    },
    'Wall': {
        expr: p => p.Fortress.Fortifications
    },
    'Quarters': {
        expr: p => p.Fortress.LaborerQuarters
    },
    'Woodcutter': {
        expr: p => p.Fortress.WoodcutterGuild
    },
    'Quarry': {
        expr: p => p.Fortress.Quarry
    },
    'Academy': {
        expr: p => p.Fortress.Academy
    },
    'Archery Guild': {
        expr: p => p.Fortress.ArcheryGuild
    },
    'Barracks': {
        expr: p => p.Fortress.Barracks
    },
    'Mage Tower': {
        expr: p => p.Fortress.MageTower
    },
    'Treasury': {
        expr: p => p.Fortress.Treasury
    },
    'Smithy': {
        expr: p => p.Fortress.Smithy
    },
    'Wood': {
        expr: p => p.Fortress.Wood
    },
    'Stone': {
        expr: p => p.Fortress.Stone
    },
    'Raid Wood': {
        expr: p => p.Fortress.RaidWood
    },
    'Raid Stone': {
        expr: p => p.Fortress.RaidStone
    },
    'Shadow': {
        expr: p => p.Pets.Shadow
    },
    'Light': {
        expr: p => p.Pets.Light
    },
    'Earth': {
        expr: p => p.Pets.Earth
    },
    'Fire': {
        expr: p => p.Pets.Fire
    },
    'Water': {
        expr: p => p.Pets.Water
    },
    'Rune Gold': {
        expr: p => p.Runes.Gold
    },
    'Rune XP': {
        expr: p => p.Runes.XP
    },
    'Rune Chance': {
        expr: p => p.Runes.Chance
    },
    'Rune Quality': {
        expr: p => p.Runes.Quality
    },
    'Rune Health': {
        expr: p => p.Runes.Health,
        width: 120
    },
    'Rune Damage': {
        expr: p => p.Runes.Damage,
        width: 110
    },
    'Rune Resist': {
        expr: p => p.Runes.Resistance,
        width: 110
    },
    'Fire Resist': {
        expr: p => p.Runes.ResistanceFire,
        width: 110
    },
    'Cold Resist': {
        expr: p => p.Runes.ResistanceCold,
        width: 110
    },
    'Lightning Resist': {
        expr: p => p.Runes.ResistanceLightning,
        width: 110
    },
    'Fire Damage': {
        expr: p => p.Runes.DamageFire,
        width: 110
    },
    'Cold Damage': {
        expr: p => p.Runes.DamageCold,
        width: 110
    },
    'Lightning Damage': {
        expr: p => p.Runes.DamageLightning,
        width: 110
    },
    'Class': {
        expr: p => p.Class,
        format: (p, x) => PLAYER_CLASS[x]
    },
    'Rank': {
        expr: p => p.Rank,
        flip: true
    },
    'Mount': {
        expr: p => p.Mount
    },
    'Awards': {
        expr: p => p.Achievements.Owned
    },
    'Album': {
        expr: p => p.Book
    },
    'Fortress Rank': {
        expr: p => p.Fortress.Rank
    },
    'Building': {
        expr: p => p.Fortress.Upgrade.Building,
        width: 180,
        format: (p, x) => FORTRESS_BUILDINGS[x]
    },
    'Last Active': {
        expr: p => p.LastOnline,
    },
    'Timestamp': {
        expr: p => p.Timestamp,
        format: (p, x) => formatDate(x)
    },
    'Guild Joined': {
        expr: p => p.Group.Joined,
        format: (p, x) => p.hasGuild() ? formatDate(x) : ''
    },
    'Gladiator': {
        expr: p => p.Fortress.Gladiator,
        format: (p, x) => (x == 0 ? '' : (x == 1 ? '1+' : (x == 5 ? '5+' : (x == 10 ? '10+' : 15))))
    }
};

// Protected
const SP_KEYWORD_MAPPING_1 = {
    'Knights': {
        expr: p => p.Fortress.Knights
    },
    'Treasure': {
        expr: p => p.Group.Treasure
    },
    'Instructor': {
        expr: p => p.Group.Instructor
    },
    'Pet': {
        expr: p => p.Group.Pet
    }
};

// Private
const SP_KEYWORD_MAPPING_2 = {
    'Aura': {
        expr: p => p.Toilet.Aura
    },
    'Twister': {
        expr: p => p.Dungeons.Twister
    }
};