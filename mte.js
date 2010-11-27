MTEBindingExpression = new Class({
    initialize: function (property, formatter) {
        this.property = property;
        this.formatter = formatter;
    },

    apply: function (engine, element, bindingSource, key) {
        if (engine.observable(bindingSource)) {
            this._observableApply(engine, element, bindingSource, key);
        } else {
            this._regularApply(engine, element, bindingSource, key);
        }
    },

    _observableApply: function (engine, element, bindingSource, key) {
        // Throw guards
        if (!this.property) {
            throw 'Binding error: a binding source property has to be specified when binding against an observable object';
        }

        var data = bindingSource.get(this.property);
        if (!data) {
            throw 'Binding error: the binding source property did not return any value (property: ' + this.property + ')';
        }

        var formatWrapper = function (x) { return this.formatter ? this.formatter(x) : x; } .bind(this);

        var childElement = getDocument().newTextNode(formatWrapper(data));
        element.adopt(childElement);

        bindingSource.listenChange(this.property, function (source, prop, value) {
            var newChildElement = getDocument().newTextNode(formatWrapper(value));
            childElement.parentNode.replaceChild(newChildElement, childElement);
            childElement = newChildElement;
        });
    },

    _regularApply: function (engine, element, bindingSource, key) {
        // Throw guards
        if (typeOf(bindingSource) != 'object' && typeOf(bindingSource) != 'array' && this.property) {
            throw 'Binding error: a binding source property may only be specified when the binding source is an object or an array';
        } else if ((typeOf(bindingSource) == 'object' || typeOf(bindingSource) == 'array') && !this.property) {
            throw 'Binding error: a binding source property must be specified when the binding source is an object or an array';
        } else if ((typeOf(bindingSource) == 'object' || typeOf(bindingSource) == 'array') && !bindingSource[this.property]) {
            throw 'Binding error: the binding source property did not return any value (property: ' + this.property + ')';
        }

        var mydata = this.property ? bindingSource[this.property] : bindingSource;
        mydata = this.formatter ? this.formatter(mydata) : mydata;

        if (!key) {
            if (engine.adoptable(mydata)) {
                element.adopt(mydata);
            } else {
                element.appendText(mydata);
            }
        } else {
            element.set(key, mydata);
        }
    }
});

MTEContextExpression = new Class({
    initialize: function (property) {
        this.property = property;
        if (!property) {
            throw 'Binding source error: property of name ' + property + ' but no complex source object';
        }        
    },

    apply: function (data) {
        if (typeOf(data) != 'object' && typeOf(data) != 'array') {
            throw 'Context source error: context must be an indexable type';
        } else if (data[this.property] == undefined) {
            throw 'Context source error: no property of name ' + this.property;
        } else {
            return data[this.property];
        }
    }
});

MTEEngine = new Class({
    Binds: ['tag', 'createElement'],

    tags: ['span', 'div', 'br', 'img', 'strong'],

    initialize: function () {
        // Create methods from tags array
        Array.each(this.tags, function (tag) {
            this[tag] = function (options, child) {
                var args = Object.values(arguments);
                args.unshift(tag);
                return this.tag.apply(this, args);
            };
        }, this);
    },

    tag: function () {
        var engine = this;
        var argsin = Object.values(arguments);
        var tag = argsin.shift();

        return function (data, parent) {
            var args = argsin;

            // Decide data context
            if (instanceOf(args[0], MTEContextExpression)) {
                args = Array.clone(args);
                data = args.shift().apply(data);
            }

            // Create elements
            if (data && engine.isObservableMap(data)) {
                var itemmap = {};
                var elements = new Elements();

                Object.each(data.map, function (item, key) {
                    var element = engine.createElement(tag, args, item);
                    elements.push(element);
                    itemmap[key] = element;
                });

                data.addEvent('clear', function (item, key) {
                    itemmap[key].destroy();
                    delete itemmap[key];
                });

                data.addEvent('set', function (item, key) {
                    var element = engine.createElement(tag, args, item);
                    parent.adopt(element);
                    itemmap[key] = element;
                });

                return elements;
            } else if (data && engine.isObservableArray(data)) {
                var elements = new Elements();
                var items = new Array();

                Array.each(data.items, function (item) {
                    var element = engine.createElement(tag, args, item);
                    elements.push(element);
                    items.push([item, element]);
                });

                data.addEvent('remove', function (removedItem) {
                    for (var i = items.length - 1; i > -1; i--) {
                        if (items[i][0] == removedItem) {
                            items[i][1].destroy();
                            items.splice(i, 1);
                        }
                    }                    
                });

                data.addEvent('add', function (item) {
                    var element = engine.createElement(tag, args, item);
                    parent.adopt(element);
                    items.push([item, element]);
                });

                return elements;
            } else if (typeOf(data) == 'array') {
                return new Elements(data.map(function (item) { return engine.createElement(tag, args, item); }));
            } else {
                return engine.createElement(tag, args, data, engine);
            }
        };
    },

    B: function (prop, formatter) {
        return new MTEBindingExpression(prop, formatter);
    },
    bind: function (prop, formatter) {
        return new MTEBindingExpression(prop, formatter);
    },

    C: function (prop) {
        return new MTEContextExpression(prop);
    },
    context: function (prop) {
        return new MTEContextExpression(prop);
    },

    createElement: function (tag, argsin, data) {
        var args = argsin;
        var engine = this;

        var element = new Element(tag);

        if (typeOf(args[0]) == 'object' && !instanceOf(args[0], MTEBindingExpression)) {
            args = Array.clone(args);
            var options = args.shift();
            Object.each(options, function (item, key) {
                if (instanceOf(item, MTEBindingExpression)) {
                    item.apply(engine, element, data, key);
                } else {
                    element.set(key, item);
                }
            });
        }

        Array.each(args, function (arg) {
            if (instanceOf(arg, MTEBindingExpression)) {
                arg.apply(engine, element, data);
            } else if (typeOf(arg) == 'function') {
                var out = arg(data, element);
                if (engine.adoptable(out)) {
                    element.adopt(out);
                } else {
                    element.appendText(out);
                }
            } else if (engine.adoptable(arg)) {
                element.adopt(arg);
            } else {
                element.appendText(arg);
            }
        });

        return element;
    },

    adoptable: function (obj) {
        return typeOf(obj) == 'object' || typeOf(obj) == 'collection' || typeOf(obj) == 'element' || typeOf(obj) == 'elements';
    },

    observable: function (obj) {
        return obj && obj.isObservable;
    },

    isObservableMap: function (obj) {
        return obj && obj.isObservableMap;
    },

    isObservableArray: function (obj) {
        return obj && obj.isObservableArray;
    }
});

MTEObservableObject = new Class({
    Binds: ['listenChange', 'triggerChange'],

    isObservable: true,

    bindings: new Events(),

    get: function(property) {
        var value = this[property];
        if (this['get' + property.capitalize()] != null) {
            value = this['get' + property.capitalize()]();
        }
        return value;
    },

    listenChange: function (property, eventHandler, initTrigger) {
        if (initTrigger) {
            eventHandler(this, property, this.get(property));
        }

        this.bindings.addEvent(property, eventHandler);
    },

    triggerChange: function (property, value) {
        this.bindings.fireEvent(property, [this, property, value]);
    }
});

MTEObservableMap = new Class({
    Extends: Events,

    map: {},

    isObservableMap: true,

    set: function (key, item) {
        var oldItem = this.map[key];
        this.map[key] = item;
        if (oldItem) {
            this.fireEvent('change', [item, key, oldItem, this]);
        } else {
            this.fireEvent('set', [item, key, this]);
        }        
    },

    clear: function (key) {        
        var item = this.map[key];
        if (item) {
            delete this.map[key];
            this.fireEvent('clear', [item, key, this]);
        }
    }
});

MTEObservableArray = new Class({
    Extends: Events,

    items: [],

    isObservableArray: true,

    add: function (item) {
        this.items.push(item);
        this.fireEvent('add', [item, this.items.length - 1, this]);
    },

    remove: function (item) {
        for (var i = this.items.length - 1; i > -1; i--) {
            if (this.items[i] == item) {                
                this.items.splice(i, 1);
                this.fireEvent('remove', [item, i, this]);
            }
        }
    }
});

// Can be used to auto implement getter and setter
Class.Mutators.MTEObservableAutoProperties = function (configuration) {
    var setFunction = function (item) {
        return function (value) {
            this[item] = value;
            this.triggerChange(item, value);
        };
    };

    var getFunction = function (item) {
        return function () { return this[item]; };
    };

    configuration.each(function (item) {
        var getName = ('get' + item.capitalize());
        var setName = ('set' + item.capitalize());
        var getterSetter = {};
        getterSetter[getName] = getFunction(item);
        getterSetter[setName] = setFunction(item);
        this.implement(getterSetter);
    }, this);

    this.implement({
        set: function (prop, value) {
            var setName = ('set' + prop.capitalize());
            this[setName](value);
        },
        get: function (prop) {
            var getName = ('get' + prop.capitalize());
            return this[getName]();
        },
        has: function (prop) {
            var getName = ('get' + prop.capitalize());
            return this[getName] != null;
        }
    });
};