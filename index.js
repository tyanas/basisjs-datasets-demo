basis.ready(function(){
    var Value = basis.require('basis.data').Value;
    var DataObject = basis.require('basis.data').Object;
    var Dataset = basis.require('basis.data').Dataset;
    var Node = basis.require('basis.ui').Node;
    var Menu = basis.require('basis.ui.menu').Menu;
    var Subtract = basis.require('basis.data.dataset').Subtract;
    var Merge = basis.require('basis.data.dataset').Merge;
    var MapFilter = basis.require('basis.data.dataset').MapFilter;
    var Filter = basis.require('basis.data.dataset').Filter;
    var Split = basis.require('basis.data.dataset').Split;
    var Slice = basis.require('basis.data.dataset').Slice;
    var Cloud = basis.require('basis.data.dataset').Cloud;
    var sumIndex = basis.require('basis.data.index').sum;
    var maxIndex = basis.require('basis.data.index').max;
    var l10n = basis.require('basis.l10n');

    l10n.setCultureList('en-US ru-RU');
    l10n.setCulture('en-US');

    //
    // Init data
    //
    var data = basis.array.create(10, function(i){
        return new DataObject({
            data: {
                value: i + 1
            }
        });
    });
    var data2 = 'one two three four five six seven eight nine ten'.split(' ').map(function(value){
        return new DataObject({
            data: {
                value: value
            }
        });
    });

    var NUMBERS = new Dataset({
        items: data
    });
    var WORDS = new Dataset({
        items: data2
    });

    var A = new Dataset({
        items: [data[0], data[1], data[2], data[3]]
    });
    var B = new Dataset({
        items: [data[2], data[3], data[4], data[5]]
    });
    var C = new Dataset({
        items: [data[1], data[2], data[5], data[6]]
    });

    //
    // Custom classes & instances
    //
    var DatasetViewer = Node.subclass({
        className: 'DatasetViewer',
        template: resource('./template/block.tmpl'),
        editable: false,
        // TODO why sum vs sum2 vs sum3
        sum3: Value.query('dataSource').as(sumIndex(basis.fn.factory(basis.fn.$self), 'update', 'data.value')),
        binding: {
            title: 'title',
            type: 'type',
            editable: 'editable',
            stat: 'satellite:',
            sum2: Value.query('dataSource').as(sumIndex(basis.fn.factory(basis.fn.$self), 'update', 'data.value')).query('value'),
            sum3: 'sum3',
            sum: {
                events: 'dataSourceChanged',
                getter: function(node){
                    return node.dataSource ? sumIndex(node.dataSource, 'data.value') : '';
                }
            },
            max: {
                events: 'dataSourceChanged',
                getter: function(node){
                    return node.dataSource ? maxIndex(node.dataSource, 'data.value') : '';
                }
            },
            count: Value.query('dataSource.itemCount'),
            image: 'image'
        },
        init: function(){
            Node.prototype.init.call(this);
            // same value as satellite.stat.sum4
            // sum3 instance will be created in satellite.stat.init
            this.sum3 = this.sum3(this).query('value');
            // this.satellite.stat.sum = this.sum3;
        },
        satellite: {
            stat: Node.subclass({
                className: 'DatasetViewer.Stat',
                template: resource('./template/stat.tmpl'),
                // sum: Value.query('owner.<static>sum3'),
                sum4: null,
                init: function() {
                    Node.prototype.init.call(this);
                    this.sum4 = Value.query(this, 'owner').as(function(owner) {
                        if (owner) {
                            return owner.sum3(owner).query('value');
                        }
                    }).query('value');
                },
                binding: {
                    sum4: 'sum4'
                },
                childClass: Node.subclass({
                    className: 'DatasetViewer.Stat.Item',
                    template: resource('./template/stat-item.tmpl'),
                    // value2: Value.query('parentNode.<static>sum4'),
                    // init: function() {
                    //     Node.prototype.init.call(this);
                    //     this.value2 = this.value2(this).query('value');
                    // },

                    binding: {
                        // value2: 'value2',
                        value: 'value',
                        type: 'type'
                    }
                }),
                childNodes: [
                    // {
                    //     type: 'sum',
                    //     value2: window.q=Value.query('parentNode.<static>sum4')
                    // },
                    // {
                    //     type: 'max',
                    //     binding: {
                            // FIXME !!!
                    //         value: Value.query('parentNode.owner.dataSource').as(function(data){
                    //             return data ? sumIndex(data, 'data.value').value : '';
                    //         })
                    //     }
                    // },
                    {
                        type: 'count',
                        binding: {
                            value: Value.query('parentNode.owner.dataSource.itemCount')
                        }
                    }
                ]
            })
        },

        childClass: {
            editable: false,
            template: resource('./template/item.tmpl'),
            binding: {
                editable: 'editable',
                value: 'data:'
            }
        }
    });

    var EditableDatasetViewer = DatasetViewer.subclass({
        editable: true,

        action: {
            add: function(event){
                newItemPopup.dataSource.setSubtrahend(this.dataSource);
                newItemPopup.show(event.sender);
            }
        },

        childClass: {
            editable: true,
            action: {
                remove: function(){
                    this.parentNode.dataSource.remove([this.delegate]);
                }
            }
        }
    });

    var newItemPopup = new Menu({
        dataSource: new Subtract({
            minuend: NUMBERS
        }),
        sorting: 'data.value',
        childClass: {
            binding: {
                caption: 'data.value'
            }
        },
        defaultHandler: function(node){
            if (node) {
                this.dataSource.subtrahend.add([node.root]);
            }
            this.hide();
        }
    });

    var DsItem = Node.subclass({
        template: resource('./template/dsitem.tmpl'),
        binding: {
            title: 'data:'
        },

        dataSource: Value.factory('delegateChanged', 'delegate'),
        childClass: DatasetViewer.prototype.childClass
    });

    //
    // Demo
    //

    var operableDatasets = [
        {
            image: 'union',
            type: 'union',
            dataSource: new Merge({
                sources: [A, B, C],
                rule: Merge.UNION  // by default
            })
        },
        {
            image: 'intersection',
            type: 'intersection',
            dataSource: new Merge({
                sources: [A, B, C],
                rule: Merge.INTERSECTION
            })
        },
        {
            image: 'atleastoneexclude',
            type: 'atleastoneexclude',
            dataSource: new Merge({
              sources: [A, B, C],
              rule: Merge.AT_LEAST_ONE_EXCLUDE
            })
        },
        {
            image: 'difference',
            type: 'difference',
            dataSource: new Merge({
                sources: [A, B, C],
                rule: Merge.DIFFERENCE
            })
        },
        {
            image: 'morethanoneinclude',
            type: 'morethanoneinclude',
            dataSource: new Merge({
                sources: [A, B, C],
                rule: Merge.MORE_THAN_ONE_INCLUDE
            })
        },
        {
            image: 'subtract',
            type: 'subtract',
            dataSource: new Subtract({
                minuend: A,
                subtrahend: B
            })
        }
    ];

    var mapFilterDatasets = [
        {
            type: 'mapfilter',
            dataSource: new MapFilter({
                source: A,
                map: basis.getter('data.value - 1').as(data2)
            })
        },
        {
            type: 'filter',
            dataSource: new Filter({
                source: A,
                rule: basis.getter('data.value % 2')
            })
        },
        {
            type: 'split',
            dataSource: new Split({
                source: A,
                rule: basis.getter('data.value % 2').as(['even', 'odd'])
            }),
            childClass: DsItem
        },
        {
            type: 'firstitems',
            sorting: basis.getter('data.value'),
            binding: {
                n: Value.query('dataSource').as(function(data){
                    return data.limit;
                })
            },
            dataSource: new Slice({
                source: A,
                rule: basis.getter('data.value'),
                limit: 4
            })
        },
        {
            type: 'cloud',
            sorting: basis.getter('data.title'),
            dataSource: new Cloud({
                source: A,
                rule: function(item){
                    var res = [];
                    var val = item.data.value;

                    for (var i = 2; i <= val; i++) {
                        if ((val % i) == 0) {
                            res.push(i);
                        }
                    }

                    return res;
                }
            }),
            childClass: DsItem
        }
    ];
    new Node({
        container: document.body,
        template: resource('./template/view.tmpl'),
        childClass: {
            template: resource('./template/group.tmpl'),
            binding: {
                type: 'type'
            },
            childClass: DatasetViewer,
        },
        childNodes: [
            {
                type: 'source',
                childNodes:[
                    {
                        title: 'dataset NUMBERS',
                        type: 'numbers',
                        dataSource: NUMBERS
                    },
                    {
                        title: 'dataset WORDS',
                        type: 'words',
                        dataSource: WORDS
                    }
                ]
            },
            {
                type: 'custom',
                childClass: EditableDatasetViewer,
                childNodes:[
                    {
                        title: 'dataset A',
                        type: 'A',
                        dataSource: A
                    },
                    {
                        title: 'dataset B',
                        type: 'B',
                        dataSource: B
                    },
                    {
                        title: 'dataset C',
                        type: 'C',
                        dataSource: C
                    }
                ]
            },
            {
                type: 'operable',
                childClass: DatasetViewer,
                childNodes: operableDatasets
            },
            {
                type: 'mapfilter',
                childClass: DatasetViewer,
                childNodes: mapFilterDatasets
            }
        ]
    });

});
