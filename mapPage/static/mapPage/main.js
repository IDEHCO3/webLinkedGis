
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
                //console.log("data: ", data);
                $scope.linkcontext = that.getContextLink(headers);
                console.log($scope.linkcontext);
                var layer = {data: data, context: null, geometryField: null};
                // get the context with the link in $scope.linkcontext if it is not null.
                if($scope.linkcontext != null){
                    $http.get($scope.linkcontext)
                        .success(function(data){
                            layer.context = data;
                            layer.geometryField = that.getTheGeometryField(data);
                            //console.log("here is the context: ",data);
                            if(that.isURL(layer.geometryField, layer.context)) {
                                for(var i=0; i<layer.data.length; i++) {
                                    var index = i;
                                    $http.get(layer.data[i][layer.geometryField])
                                        .success(function (data) {
                                            //layer.data[index][layer.geometryField] = data;
                                            data.properties = layer.data[index];
                                            L.geoJson(data,{
                                                onEachFeature: that.onEachFeature
                                            }).addTo(map);
                                        })
                                        .error(function (data) {
                                            //console.log("Error to get geometry from data["+i+"]["+layer.geometryField+"] with value: "+layer.data[i][layer.geometryField]);
                                        });
                                }
                            }
                        })
                        .error(function(data){
                            console.log("Error to get context data!");
                        });
                }

                $scope.layers.push(layer);

            })
            .error(function(data, status, headers, config) {
                console.log("Error to get data layer!");
            });
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

    this.isURL = function(geometryField, context){
        //TODO test if the field is a geometry field
        return true;
    }

    this.getTheGeometryField = function(context){
        //TODO search and return the field that is a geometry type or with @id == http://geojson.org/vocab#geometry and @type == @id
        return "url_geometry";
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