
(function (factory, window) {

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);

    // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        module.exports = factory(require('leaflet'));
    }

    // attach your plugin to the global 'L' variable
    if (typeof window !== 'undefined' && window.L) {
        window.L.LinkedGeojson = factory(L);
    }
}(function (L) {
    var LinkedGeojson = L.Class.extend({
        options: {
            loadProperties: true,
            loadExternalProperties: true
        },

        _data: null,
        _context: null,
        _groupLayer: null,
        _fieldsList: null,
        _geometryFieldName: null,

        _getContextLink: function(headers){
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
        },

        _getContext: function(urlContext){
            var that = this;
            $.ajax({
                type: "GET",
                url: urlContext,
                dataType: "json"
            }).done(function(data){
                that._context = data;
                console.log("wtf");
            }).fail(function(data){
                console.log("Error to get context!");
            });
        },

        _getData: function(url){
            var that = this;
            $.ajax({
                    type: "GET",
                    url: url,
                    dataType: "json"
            }).done(function(data, textStatus, jqXHR) {
                console.log("huehuebr: ", jqXHR);
                that._data = data;
                var contextLink = that._getContextLink(jqXHR.getResponseHeader);
                if(contextLink) {
                    that._getContext(contextLink);
                }
            }).fail(function(response) {
                console.log(response);
            });
        },

        initialize: function (urlData, options) {
            L.Util.setOptions(this, options);
            this._getData(urlData);
        },

        getLayer: function(){
            return this._groupLayer;
        },

        _loadExternalData: function(datain){
            for(var j=0;  j<this._fieldsList.length; j++){
                $.ajax({
                    type: "GET",
                    url: datain[this._fieldsList[j]],
                    dataType: "json"
                }).done(function(data){
                    console.log(data);
                }).fail(function(data){
                    console.log(data);
                });
            }
        },

        _loadExternalGeometry: function(data){},

        _getGeometryField: function(){
            var geometry_field = "";
            for(var field_key in this._context['@context']){
                var field = this._context['@context'][field_key];
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
            this._geometryFieldName = geometry_field;
        },

        _getURLFields: function(){
            var fields_list = [];
            for(var field_key in this._context['@context']){
                var field = this._context['@context'][field_key];
                if(typeof field == 'object' && field['@type'] == '@id' && field_key in this._data[0] && field_key != this._geometryFieldName){
                    fields_list.push(field_key);
                }
            }
            this._fieldsList = fields_list;
        },

        loadLayer: function(){
            var that = this;
            setTimeout(function(){
                that._getGeometryField();
                that._getURLFields();
                that._groupLayer = L.layerGroup();
                for(var i=0; i<that._data.length; i++){
                    that._loadExternalData(that._data[i]);
                }
            }, 0);
        }
    });

    // return your plugin when you are done
    return LinkedGeojson;
}, window));