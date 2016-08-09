
var map = L.map('map').setView([-22.862663, -43.225825], 14);
map.zoomControl.setPosition('bottomright');

mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; ' + mapLink + ' Contributors',
    maxZoom: 18
}).addTo(map);