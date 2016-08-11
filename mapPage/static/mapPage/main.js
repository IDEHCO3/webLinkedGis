
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

    var that = this;

    $scope.loadLayer = function(){
        console.log($scope.linkLayer);
        $http.get($scope.linkLayer)
            .success(function(data, status, headers, config) {
                console.log("data: ", data);
                $scope.linkcontext = that.getContextLink(headers);
                console.log($scope.linkcontext);

            })
            .error(function(data, status, headers, config) {
                console.log("Error to get data layer!");
            });
    };

    this.getContextLink = function(headers){
        var linkheader = headers('link');
        var globalLink = '';
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