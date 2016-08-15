
var map = L.map('map').setView([-22.862663, -43.225825], 14);
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
        $http.get($scope.linkLayer)
            .success(function(data, status, headers, config) {
                that.loadAllData(data, headers);
            })
            .error(function(data, status, headers, config) {
                console.log("Error to get data layer!");
            });
    };

    this.loadAllData = function(data, headers){
        $scope.linkcontext = that.getContextLink(headers);
        console.log($scope.linkcontext);
        var layer = {data: data, context: null, geometryFieldName: null, geometry: []};
        // get the context with the link in $scope.linkcontext if it is not null.
        if($scope.linkcontext != null){
            $http.get($scope.linkcontext)
                .success(function(data){
                    layer.context = data;
                    layer.geometryFieldName = that.getTheGeometryField(data);
                    that.getDataFromURLFields(layer);
                    that.loadGeometry(layer);
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
                var index = i;
                $http.get(layer.data[i][layer.geometryFieldName])
                    .success(function (data) {
                        layer.geometry.push(data);
                        data.properties = layer.data[index];
                        L.geoJson(data,{
                            onEachFeature: that.onEachFeature
                        }).addTo(map);
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
                if(layer.data[i]){
                    var url = layer.data[i][fields_list[j]];
                    var index1 = i;
                    var index2 = j;
                    $http.get(url)
                        .success(function (data) {
                            console.log("object come from bcedgv: ", data);
                            for(var field in data){
                                layer.data[index1][fields_list[index2]] = data[field];
                                break;
                            }

                        })
                        .error(function (data) {
                            console.log("Error: during");
                        });
                }
                else{
                    console.log("Error: url undefined! ", layer.data[i], fields_list[j]);
                }
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