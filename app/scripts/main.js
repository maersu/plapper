/* global Parse, Backbone, _ */

Parse.initialize('SaZoDUesEXubVcmPUX6YWsWTNIxhiNAeabhHM9eC', 'JPQJHefkbcfa3ceRpyxMHWrOYiW7alqwhEaXKKfg');

var app = app || {};

$(function () {
    'use strict';

    var Item = Parse.Object.extend('Item', {
    });

    var Items = Parse.Collection.extend({
        model: Item
    });
    app.items = new Items();

    app.AppView = Backbone.View.extend({

        el: '#insertApp',
        events: {
            'click #btn-new-item': 'createItem',
            'click #submit-btn': 'login',
            'click #logout-btn': 'logout'
        },

        initialize: function () {
            this.$input = this.$('#new-item');
            this.$list = $('#item-list');
            this.$username = $('#inputUsername');
            this.$password = $('#inputPassword');
            this.$public = $('#check-public');

            this.listenTo(app.items, 'add', this.addOne);
            this.listenTo(app.items, 'reset', this.addAll);
            this.listenTo(app.items, 'all', this.render);

            _.bindAll(this, 'createItem', 'login', 'logout');

            var user = Parse.User.current();
            if (user) {
                this.loggedIn(user);
            } else {
                this.logout();
            }
        },

        isNewItemPublic: function () {
            return (this.$public.is(':checked') || !(Parse.User.current()));
        },

        createItem: function (e) {
            e.preventDefault();

            if (!this.$input.val().trim()) {
                return;
            }

            var item = new Item(this.newAttributes());
            var user =  Parse.User.current();
            var postACL = new Parse.ACL(user);

            if (this.isNewItemPublic()) {
                postACL.setPublicReadAccess(true);
                if (!user) {
                    postACL.setPublicWriteAccess(true);
                }
            }

            item.setACL(postACL);
            item.save();
            app.items.add(item);

            this.$input.val('');
        },

        logout: function () {
            Parse.User.logOut();
            $('.user').hide();
            $('.no-user').show();
            this.loadItems();
        },

        login: function (e) {
            e.preventDefault();
            var self = this;
            var btn = $('#submit-btn');
            btn.button('loading');

            Parse.User.logIn(this.$username.val(), this.$password.val(), {
                success: function (user) {
                    self.$('.login-form .error').html('');
                    self.loggedIn(user);
                    btn.button('reset');
                },
                error: function () {
                    self.$('.login-form .error').html('Invalid username or password. Please try again.').show();
                    btn.button('reset');
                }
            });
        },

        loggedIn: function (user) {
            $('#user-info-username').html(user.get('username'));
            $('.no-user').hide();
            $('.user').show();

            this.loadItems();
        },

        loadItems: function () {
            $('#item-list').html('');
            app.items.fetch({reset: true});
        },

        newAttributes: function () {

            var user = Parse.User.current(),
                username;
            if (user) {
                username = user.get('username');
            }

            return {
                text: this.$input.val(),
                updatedAt: new Date(),
                username: username,
                user: user,
                public: this.isNewItemPublic(),
                ACL: {}
            };
        },

        addOne: function (item) {
            var view = new app.ItemView({
                model: item
            });
            this.$list.prepend(view.render().el);
        },

        addAll: function () {
            this.$list.html('');
            app.items.each(this.addOne, this);
        }

    });

    app.ItemView = Backbone.View.extend({
        tagName: 'div',

        events: {
            'click .delete-btn': 'deleteItem'
        },

        template: _.template($('#item-template').html()),

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },

        deleteItem: function (e) {
            e.preventDefault();
            var self = this;


            self.model.destroy({
                success: function () {
                    self.destroyView();
                },
                error: function (myObject, error) {
                    window.alert('error: ' + JSON.stringify(error));
                }
            });
        },

        render: function () {
            var json = this.model.toJSON(),
                acl = this.model.getACL(),
                user = Parse.User.current();

            json.hasWriteAccess = (acl.getWriteAccess(user) || acl.getPublicWriteAccess(user));
            this.$el.html(this.template(json));
            return this;
        },

        destroyView: function () {
            this.undelegateEvents();
            this.$el.removeData().unbind();
            this.remove();
            Backbone.View.prototype.remove.call(this);
        }

    });

    new app.AppView();
});