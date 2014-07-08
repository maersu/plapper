Parse.Cloud.beforeSave("Item", function (request, response) {
    var text = request.object.get("text");
    request.object.set("text", text.replace(new RegExp("(fuck)", 'gi'), "nice"));
    response.success();
});