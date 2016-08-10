
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

    $scope.loadLayer = function(){
        console.log($scope.linkLayer);
        $http.get($scope.linkLayer)
            .success(function(data, status, headers, config) {
                console.log("data: ", data);
                var linkheader = headers('link');
                var link = linkheader.match(/<(.+)>;/)[1];
                console.log("headers: ", link);
                $scope.linkLayer = link;
            })
            .error(function(data, status, headers, config) {
                console.log("Error to get data layer!");
            });

    };
}]);