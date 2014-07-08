/* global Parse, Backbone, _ */

Parse.initialize('SaZoDUesEXubVcmPUX6YWsWTNIxhiNAeabhHM9eC', 'JPQJHefkbcfa3ceRpyxMHWrOYiW7alqwhEaXKKfg');

var app = app || {};


$(function () {
    'use strict';

    var showError = function (msg) {
        $('#modal-error .modal-body').html(msg);
        $('#modal-error').modal('show');
    };

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
            'click #login-btn': 'login',
            'click #register-btn': 'register',
            'click #logout-btn': 'logout'
        },

        initialize: function () {
            this.$input = this.$('#new-item');
            this.$list = $('#item-list');
            this.$public = $('#check-public');

            this.listenTo(app.items, 'add', this.addOne);
            this.listenTo(app.items, 'reset', this.addAll);
            this.listenTo(app.items, 'all', this.render);

            _.bindAll(this, 'createItem', 'login', 'logout', 'createSuccess', 'createError');

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
            $('#btn-new-item').button('loading');
            var item = new Item(this.newAttributes());
            var user = Parse.User.current();
            var postACL = new Parse.ACL(user);

            if (this.isNewItemPublic()) {
                postACL.setPublicReadAccess(true);
                if (!user) {
                    postACL.setPublicWriteAccess(true);
                }
            }

            item.setACL(postACL);
            item.save({success: this.createSuccess, error: this.createError});
            app.items.add(item);

            this.$input.val('');
        },

        createSuccess: function () {
            $('#btn-new-item').button('reset');
        },

        createError: function (object, error) {
            $('#btn-new-item').button('reset');
            showError(error.message);
        },

        logout: function () {
            Parse.User.logOut();
            $('.user').hide();
            $('.no-user').show();
            this.loadItems();
        },

        register: function (e) {
            e.preventDefault();
            var self = this;
            var btn = $('#register-btn');
            btn.button('loading');

            var user = new Parse.User();
            user.set('username', $('#registerUsername').val());
            user.set('password', $('#registerPassword').val());

            user.signUp(null, {
                success: function (user) {
                    btn.button('reset');
                    self.loggedIn(user);
                    $('#modal-register').modal('hide');
                },
                error: function (user, error) {
                    showError(error.message);
                    btn.button('reset');
                }
            });
        },

        login: function (e) {
            e.preventDefault();
            var self = this;
            var btn = $('#login-btn');
            btn.button('loading');

            Parse.User.logIn($('#inputUsername').val(), $('#inputPassword').val(), {
                success: function (user) {
                    self.$('.login-form .error').html('');
                    self.loggedIn(user);
                    btn.button('reset');
                    $('#modal-login').modal('hide');
                },
                error: function (user, error) {
                    showError(error.message);
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
            'click .delete-btn': 'deleteItem',
            'blur .text': 'changeText'
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
                error: function (object, error) {
                    showError(error.message);
                }
            });
        },

        changeText: function () {
            this.model.set('text', this.$el.find('.text').html());
            this.model.save({error: function (object, error) {
                showError(error.message);
            }});
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