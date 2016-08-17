$(".togglePanelBody").click(function(){
    var $dataToggle = $($(this).attr('data-toggle'));
    $dataToggle.toggleClass('hidden');
});

var map = L.map('map').setView([-22.862663, -43.225825], 5);
map.zoomControl.setPosition('bottomright');

mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; ' + mapLink + ' Contributors',
    maxZoom: 18
}).addTo(map);

var app = angular.module('webgis',[]).config(function($interpolateProvider){
    $interpolateProvider.startSymbol('{$');
    $interpolateProvider.endSymbol('$}');
});

//execute the action of ng-enter attribute.
app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) { // test if this is a enter!
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

app.controller('mainController', ['$scope', '$http', function($scope, $http){

    $scope.linkLayer = '';
    $scope.linkcontext = '';
    $scope.layers = [];

    var that = this;

    $scope.loadLayer = function(){
        console.log($scope.linkLayer);
        if(!that.isLayerLoaded($scope.linkLayer)) {
            $http.get($scope.linkLayer)
                .success(function (data, status, headers, config) {
                    that.loadAllData(data, headers, config.url);
                })
                .error(function (data) {
                    console.log("Error to get data layer!");
                });
        }
        else{
            console.log("The layer was already loaded!");
        }
    };

    $scope.toggleLayer = function(layer, divName, divClassName){
        var $div = $(divName);
        $div.toggleClass(divClassName);

        if(layer.active) {
            map.removeLayer(layer.layerGroup);
            layer.active = false;
        }
        else{
            layer.layerGroup.addTo(map);
            layer.active = true;
        }
    };

    this.isLayerLoaded = function(url){
        for(var i=0; $scope.layers.length; i++){
            if(url == $scope.layers[i].url){
                return true;
            }
        }
        return false;
    };

    this.loadAllData = function(data, headers, url){
        $scope.linkcontext = that.getContextLink(headers);
        console.log($scope.linkcontext);
        var layer = {data: data, layerGroup: L.layerGroup(), active: true, url: url, context: null, geometryFieldName: null};
        layer.layerGroup.addTo(map);

        if($scope.linkcontext != null){
            $http.get($scope.linkcontext, {layer: layer})
                .success(function(data, status, headers, config){
                    config.layer.context = data;
                    config.layer.geometryFieldName = that.getTheGeometryField(data);
                    that.getDataFromURLFields(config.layer);
                    that.loadGeometry(config.layer);
                })
                .error(function(data){
                    console.log("Error to get context data!");
                });
        }

        $scope.layers.push(layer);
    };

    this.loadGeometry = function(layer){
        if(that.isURLTheGeometryField(layer.geometryFieldName, layer.context)) {
            for(var i=0; i<layer.data.length; i++) {
                // the answer for this problem: http://stackoverflow.com/questions/14220321/how-do-i-return-the-response-from-an-asynchronous-call/14220323#14220323
                $http.get(layer.data[i][layer.geometryFieldName],{i: i, layer: layer})
                    .success(function (data, status, headers, config) {

                        data.properties = config.layer.data[config.i];
                        var sublayer = L.geoJson(data,{
                            onEachFeature: that.onEachFeature
                        });

                        config.layer.layerGroup.addLayer(sublayer);
                    })
                    .error(function (data) {
                        console.log("Error to get geometry");
                    });
            }
        }
    };

    this.getDataFromURLFields = function(layer){
        var fields_list = that.getURLFields(layer);

        for(var i=0; i<layer.data.length; i++){
            for(var j=0;  j<fields_list.length; j++){
                var url = layer.data[i][fields_list[j]];
                $http.get(url, {layer: layer, i: i, field_name: fields_list[j]})
                    .success(function (data, status, headers, config) {
                        for(var field in data){
                            config.layer.data[config.i][config.field_name] = data[field];
                            break;
                        }

                    })
                    .error(function (data) {
                        console.log("Error: during");
                    });
            }
        }
    };

    this.getURLFields = function(layer){
        var fields_list = [];
        for(var field_key in layer.context['@context']){
            var field = layer.context['@context'][field_key];
            if(typeof field == 'object' && field['@type'] == '@id' && field_key in layer.data[0] && field_key != layer.geometryFieldName){
                fields_list.push(field_key);
            }
        }
        return fields_list;
    };

    this.onEachFeature = function(feature, layer) {
        var showData = '<ul class="list-group">';
        for(var key in feature.properties){
            var value = feature.properties[key];
            var item = '<li class="list-group-item"><b>' + key + ':</b> ' + value + '</li>';
            showData += item;
        }
        showData += '</ul>';
        layer.bindPopup(showData);
    };

    this.isURLTheGeometryField = function(geometryField, context){
        //TODO test if the field is a geometry field
        var field = context['@context'][geometryField];
        if(typeof field == 'object') {
            return field['@type'] == '@id';
        }

        return false;
    };

    this.getTheGeometryField = function(context){
        //TODO search and return the field that is a geometry type or with @id == http://geojson.org/vocab#geometry and @type == @id
        var geometry_field = "";
        for(var field_key in context['@context']){
            var field = context['@context'][field_key];
            var type_field = typeof field;
            if(type_field == 'string'){
                if (field == 'http://geojson.org/vocab#geometry') {
                    geometry_field = field;
                    break;
                }
            }
            else if(type_field == 'object') {
                if (field['@id'] == 'http://geojson.org/vocab#geometry') {
                    geometry_field = field_key;
                    break;
                }
            }
        }
        return geometry_field;
    };

    this.getContextLink = function(headers){
        var linkheader = headers('link');
        var globalLink = null;
        if(linkheader == null){
            console.log("No context link found!");
        }
        else{
            var link = linkheader.match(/<(.+?)>;/);
            if(link != null) link = link[1];

            var linkrel = linkheader.match(/rel=(\'|\")(.+?)(\'|\");/);
            if(linkrel != null) linkrel = linkrel[2];

            var linktype = linkheader.match(/type=(\'|\")(.+?)(\'|\");/);
            if(linktype != null) linktype = linktype[2];

            if(linkrel == "http://www.w3.org/ns/json-ld#context" && linktype == "application/ld+json") globalLink = link;

        }

        return globalLink;
    };
}]);