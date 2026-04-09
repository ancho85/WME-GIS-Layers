/* eslint-disable camelcase */
/* eslint-disable brace-style, curly, nonblock-statement-body-position, no-template-curly-in-string, func-names */
// ==UserScript==
// @name         WME GIS Layers
// @namespace    https://greasyfork.org/users/324334
// @version      2025.04.23.000-py028
// @description  Adds Paraguay GIS layers in WME
// @author       MapOMatic
// @match         *://*.waze.com/*editor*
// @exclude       *://*.waze.com/user/editor*
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js
// @require      https://update.greasyfork.org/scripts/506614/1441195/ESTreeProcessor.js
// @require      https://update.greasyfork.org/scripts/509664/WME%20Utils%20-%20Bootstrap.js
// @require      https://update.greasyfork.org/scripts/516445/1480246/Make%20GM%20xhr%20more%20parallel%20again.js
// @connect      greasyfork.org
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_setClipboard
// @license      GNU GPLv3
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @connect      *
// @connect www.asuncion.gov.py
// @connect analisis.stp.gov.py
// @connect www.arcgis.com
// @connect services1.arcgis.com
// @connect services2.arcgis.com
// @connect services3.arcgis.com
// @connect services5.arcgis.com
// @connect services6.arcgis.com
// @connect services8.arcgis.com
// @connect services9.arcgis.com
// @connect geohidroinformatica.itaipu.gov.py
// @connect geobosques.pti.org.py
// @connect catastro.gov.py
// @connect geo1.skycop.com.py
// @connect sigcosiplan.unasursg.org
// @connect snmf.infona.gov.py
// @connect 190.52.167.121
// @connect sedac.ciesin.columbia.edu
// @connect 190.128.205.76
// @connect wwf-sight-maps.org
// @connect www.geosur.info
// @connect a.mapillary.com
// @connect geoshape.unasursg.org
// @connect geo-ide.carto.com
// @connect 201.217.59.143
// @connect pese.pti.org.py
// @connect geo.pti.org.py
// @connect www.mapadeasentamientos.org.py
// @connect gis-gfw.wri.org
// @connect opengeo.pol.una.py
// @connect gis.mic.gov.py
// @connect vigisalud.gov.py
// @connect mapaescolar.mec.gov.py
// @connect apps.mades.gov.py
// @connect www.mopc.gov.py
// ==/UserScript==

/* global WazeWrap */
/* global _ */
/* global turf */
/* global ESTreeProcessor */
/* global bootstrap */
/* global W, OpenLayers */

(async function main() {
    'use strict';

    const SHOW_UPDATE_MESSAGE = true;
    const SCRIPT_VERSION_CHANGES = ['Added a setting to display a popup with layer labels which can be used to copy label text (thanks to JS55CT for creating this!).'];

    // **************************************************************************************************************
    // IMPORTANT: Update this when releasing a new version of script that includes changes to the spreadsheet format
    //            that may cause old code to break.  This # should match the version listed in the spreadsheet
    //            i.e. update them at the same time.

    // const LAYER_DEF_VERSION = '2018.04.27.001';  // NOT ACTUALLY USED YET

    // **************************************************************************************************************
    // const UPDATE_MESSAGE = 'Bug fix due to WME update';
    // const UPDATE_MESSAGE = `<ul>${[
    //     'Added ability to shift layers. Right click a layer in the list to bring up the layer settings window.'
    // ].map(item => `<li>${item}</li>`).join('')}</ul><br>`;
    const GF_URL = 'https://greasyfork.org/scripts/388277-wme-paraguay-gis-layers';
    // Used in tooltips to tell people who to report issues to.  Update if a new author takes ownership of this script.
    const SCRIPT_AUTHOR = 'ancho85'; // MapOMatic is the original author, but he won't fix any Paraguay related issues
    // const LAYER_INFO_URL = 'https://spreadsheets.google.com/feeds/list/1cEG3CvXSCI4TOZyMQTI50SQGbVhJ48Xip-jjWg4blWw/o7gusx3/public/values?alt=json';
    const LAYER_DEF_SPREADSHEET_URL = 'https://sheets.googleapis.com/v4/spreadsheets/1aePOmux2IBxE_2CGPOequGnubr9g4hWr1wH_qAjcM24/values/layerDefs';
    const API_KEY = 'UVVsNllWTjVSSEJvYm5sQ05FdElNa3BqV1RBMFZtZHRSMDFRYm5Ca1ZURkZNRGRIYUVkbg==';
    const REQUEST_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfMhBxF0P6bn8dFfOoNTAF1LHBFXr5w9oXvzqsii_TfA-_Bmw/viewform?usp=pp_url&entry.831784226={username}';
    const DEC = s => atob(atob(s));
    const PRIVATE_LAYERS = { 'nc-henderson-sl-signs': ['the_cre8r', 'mapomatic'] }; // case sensitive -- use all lower case
    // const COUNTRIES = {
    //     'United States': {
    //         sheetId: '1cEG3CvXSCI4TOZyMQTI50SQGbVhJ48Xip-jjWg4blWw',
    //         sheetLayerRange: 'layerDefs'
    //     }
    // };
    const DEFAULT_STYLE = {
        fillColor: '#000',
        pointRadius: 4,
        label: '${label}',
        strokeColor: '#ffa500',
        strokeOpacity: '0.95',
        strokeWidth: 1.5,
        fontColor: '#ffc520',
        fontSize: '13',
        labelOutlineColor: 'black',
        labelOutlineWidth: 3
    };
    const LAYER_STYLES = {
        cities: {
            fillOpacity: 0.3,
            fillColor: '#f65',
            strokeColor: '#f65',
            fontColor: '#f62'
        },
        forests_parks: {
            fillOpacity: 0.4,
            fillColor: '#585',
            strokeColor: '#484',
            fontColor: '#8b8'
        },
        milemarkers: {
            strokeColor: '#fff',
            fontColor: '#fff',
            fontWeight: 'bold',
            fillOpacity: 0,
            labelYOffset: 10,
            pointRadius: 2,
            fontSize: 12
        },
        parcels: {
            fillOpacity: 0,
            fillColor: '#ffa500'
        },
        points: {
            strokeColor: '#000',
            fontColor: '#0ff',
            fillColor: '#0ff',
            labelYOffset: -10,
            labelAlign: 'ct'
        },
        post_offices: {
            strokeColor: '#000',
            fontColor: '#f84',
            fillColor: '#f84',
            fontWeight: 'bold',
            labelYOffset: -10,
            labelAlign: 'ct'
        },
        state_parcels: {
            fillOpacity: 0,
            strokeColor: '#e62',
            fillColor: '#e62',
            fontColor: '#e73'
        },
        state_points: {
            strokeColor: '#000',
            fontColor: '#3cf',
            fillColor: '#3cf',
            labelYOffset: -10,
            labelAlign: 'ct'
        },
        road_labels: {
            strokeOpacity: 0,
            fillOpacity: 0,
            fontColor: '#faf'
        },
        structures: {
            fillOpacity: 0,
            strokeColor: '#f7f',
            fontColor: '#f7f'
        },
        water: {
            fillOpacity: 1,
            strokeColor: '#13a1dd',
            fillColor: '#13a1dd',
            fontColor: '#13a1dd',
            fontWeight: 'bold'
        }
    };
    let ROAD_STYLE;
    function initRoadStyle() {
        // SDK: Need styles that allow parameters
        ROAD_STYLE = new OpenLayers.Style({
            pointRadius: 12,
            fillColor: '#369',
            pathLabel: '${label}',
            label: '',
            fontColor: '#faf',
            labelSelect: true,
            pathLabelYOffset: '${getOffset}',
            pathLabelCurve: '${getSmooth}',
            pathLabelReadable: '${getReadable}',
            labelAlign: '${getAlign}',
            labelOutlineWidth: 3,
            labelOutlineColor: '#000',
            strokeWidth: 3,
            stroke: true,
            strokeColor: '#f0f',
            strokeOpacity: 0.4,
            fontWeight: 'bold',
            fontSize: 11
        }, {
            context: {
                getOffset() { return -(sdk.Map.getZoomLevel() + 5); },
                getSmooth() { return ''; },
                getReadable() { return '1'; },
                getAlign() { return 'cb'; }
            }
        });
    }

    // eslint-disable-next-line no-unused-vars
    const _regexReplace = {
        // Strip leading zeros or blank full label for any label starting with a non-digit or
        // is a Zero Address, use with '' as replace.
        r0: /^(0+(\s.*)?|\D.*)/,
        // Strip Everything After Street Type to end of the string by use $1 and $2 capture
        // groups, use with replace '$1$2'
        // eslint-disable-next-line max-len
        r1: /^(.* )(Ave(nue)?|Dr(ive)?|St(reet)?|C(our)?t|Cir(cle)?|Blvd|Boulevard|Pl(ace)?|Ln|Lane|Fwy|Freeway|R(oa)?d|Ter(r|race)?|Tr(ai)?l|Way|Rte \d+|Route \d+)\b.*/gi,
        // Strip SPACE 5 Digits from end of string, use with replace ''
        r2: /\s\d{5}$/,
        // Strip Everything after a "~", ",", ";" to the end of the string, use with replace ''
        r3: /(~|,|;|\s?\r\n).*$/,
        // Move the digits after the last space to before the rest of the string using, use with
        // replace '$2 $1'
        r4: /^(.*)\s(\d+).*/,
        // Insert newline between digits (including "-") and everything after the digits,
        // except(and before) a ",", use with replace '$1\n$2'
        r5: /^([-\d]+)\s+([^,]+).*/,
        // Insert newline between digits and everything after the digits, use with
        // replace '$1\n$2'
        r6: /^(\d+)\s+(.*)/
    };

    let _gisLayers = [];

    const _layerRefinements = [
        {
            id: 'us-post-offices',
            labelHeaderFields: ['LOCALE_NAME']
        }
    ];

    const STATES = {
        _states: [
            ['PRY (Pais)', 'PRY', -1], ['Asuncion (Capital)', 'ASU', 0], ['Concepcion', 'CON', 1],
            ['San Pedro', 'SAN', 2], ['Cordillera', 'COR', 3], ['Guaira', 'GUA', 4],
            ['Caaguazu', 'CAG', 5], ['Caazapa', 'CAZ', 6], ['Itapua', 'ITA', 7],
            ['Misiones', 'MIS', 8], ['Paraguari', 'PAR', 9], ['Alto Parana', 'ANA', 10],
            ['Central', 'CEN', 11], ['Neembucu', 'NEE', 12], ['Amambay', 'AMA', 13], ['Canindeyu', 'CAN', 14],
            ['Presidente Hayes', 'PHA', 15], ['Boqueron', 'BOQ', 16], ['Alto Paraguay', 'AAY', 17],
        ],
        toAbbr(fullName) { return this._states.find(a => a[0] === fullName)[1]; },
        toFullName(abbr) { return this._states.find(a => a[1] === abbr)[0]; },
        toFullNameArray() { return this._states.map(a => a[0]); },
        toAbbrArray() { return this._states.map(a => a[1]); },
        fromId(id) { return this._states.find(a => a[2] === id); }
    };
    const DEFAULT_VISIBLE_AT_ZOOM = 18;
    const SETTINGS_STORE_NAME = 'wme_gis_layers';
    const COUNTIES_URL = 'https://analisis.stp.gov.py:443/user/ine/api/v2/';
    // const COUNTIES_URL2 = 'https://services2.arcgis.com/tnyi76ruua1nbtl3/ArcGIS/rest/services/Paraguay_Interactive/FeatureServer/0';
    const COUNTIES_URL2 = 'https://services2.arcgis.com/Xim64FzemN4fqY1y/ArcGIS/rest/services/PY_Departamentos_y_Municipios/FeatureServer/0';
    const scriptName = GM_info.script.name;
    const scriptVersion = GM_info.script.version;
    const downloadUrl = 'https://greasyfork.org/scripts/388277-wme-paraguay-gis-layers/code/WME%20Paraguay%20GIS%20Layers.user.js';
    const sdk = await bootstrap({ scriptUpdateMonitor: { downloadUrl } });
    let mapLayer = null;
    let roadLayer = null;
    let settings = {};
    let ignoreFetch = false;
    let lastToken = {};
    let userInfo;

    // Variables to store Label popup position and selected layer
    const layerLabels = {};
    let isPopupVisible = null;
    const popupPosition = { left: '50%', top: '50%' };
    let popupActiveLayer = null;
    let useAcronyms = false;
    let useTitleCase = false;
    let useStateHwy = false;
    let removeNewLines = false;

    const DEBUG = true;
    // function log(message) { console.log('GIS Layers:', message); }
    function logError(message, args = []) { console.error(`${scriptName}:`, message, ...args); }
    function logDebug(message, args = []) { if (DEBUG) console.debug(`${scriptName}:`, message, ...args); }
    // function logWarning(message) { console.warn('GIS Layers:', message); }

    let _layerSettingsDialog;

    class LayerSettingsDialog {
        #gisLayer;
        #minVisibleAtZoom = 12;
        #maxVisibleAtZoom = 22;
        #titleText;
        #shiftUpButton;
        #visibleAtZoomInput;

        constructor() {
            this.#titleText = $('<span>');
            const closeButton = $('<span>', {
                style: 'cursor:pointer;padding-left:4px;font-size:17px;color:#d6e6f3;float:right;',
                class: 'fa fa-window-close'
            }).click(() => this.#onCloseButtonClick());
            const shiftUpButton = LayerSettingsDialog.#createShiftButton('fa-angle-up').click(() => this.#onShiftButtonClick(0, 1));
            const shiftLeftButton = LayerSettingsDialog.#createShiftButton('fa-angle-left').click(() => this.#onShiftButtonClick(-1, 0));
            const shiftRightButton = LayerSettingsDialog.#createShiftButton('fa-angle-right').click(() => this.#onShiftButtonClick(1, 0));
            const shiftDownButton = LayerSettingsDialog.#createShiftButton('fa-angle-down').click(() => this.#onShiftButtonClick(0, -1));
            const resetOffsetButton = $('<button>', {
                class: 'form-control',
                style: 'height: 24px; width: auto; padding: 2px 6px 0px 6px; display: inline-block; float: right;'
            }).text('Reset').click(() => this.#onResetOffsetButtonClick());

            this._dialogDiv = $('<div>', {
                style: 'position: fixed; top: 15%; left: 400px; width: 200px; z-index: 100; background-color: #73a9bd; border-width: 1px; border-style: solid;'
                  + 'border-radius: 10px; box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.7); border-color: #50667b; padding: 4px;'
            }).append($('<div>').append( // The extra div is needed here. When the header text wraps, the main dialog div won't expand properly without it.
                // HEADER
                $('<div>', { style: 'border-radius:5px 5px 0px 0px; padding: 4px; color: #fff; font-weight: bold; text-align:left; cursor: default;' }).append(
                    closeButton,
                    this.#titleText
                ),
                // BODY
                $('<div>').append(
                    $('<div>', { style: 'border-radius: 5px; width: 100%; padding: 4px; background-color:#d6e6f3; display:inline-block; margin-right:5px;' }).append(
                        resetOffsetButton,
                        $('<input>', {
                            type: 'radio', id: 'gisLayerShiftAmt1', name: 'gisLayerShiftAmt', value: '1', checked: 'checked'
                        }),
                        $('<label>', { for: 'gisLayerShiftAmt1' }).text('1m'),
                        $('<input>', {
                            type: 'radio', id: 'gisLayerShiftAmt10', name: 'gisLayerShiftAmt', value: '10', style: 'margin-left: 6px'
                        }),
                        $('<label>', { for: 'gisLayerShiftAmt10' }).text('10m'),
                        $('<div>', { style: 'padding: 4px' }).append(
                            $('<table>', { style: 'table-layout:fixed; width:60px; height:84px; margin-left:auto;margin-right:auto;' }).append(
                                $('<tr>', { style: 'width: 20px; height: 28px;' }).append(
                                    $('<td>', { align: 'center' }),
                                    $('<td>', { align: 'center' }).append(shiftUpButton),
                                    $('<td>', { align: 'center' })
                                ),
                                $('<tr>', { style: 'width: 20px; height: 28px;' }).append(
                                    $('<td>', { align: 'center' }).append(shiftLeftButton),
                                    $('<td>', { align: 'center' }),
                                    $('<td>', { align: 'center' }).append(shiftRightButton)
                                ),
                                $('<tr>', { style: 'width: 20px; height: 28px;' }).append(
                                    $('<td>', { align: 'center' }),
                                    $('<td>', { align: 'center' }).append(shiftDownButton),
                                    $('<td>', { align: 'center' })
                                )
                            )
                        )
                    ),
                    $('<div>', { style: 'border-radius: 5px; width: 100%; padding: 4px; background-color: #d6e6f3; display: inline-block; margin-right: 5px; margin-top: 2px;' }).append(
                        $('<div>', { style: 'display: flex; justify-content: flex-end; margin-bottom: 4px;' }).append(
                            $('<button>', { class: 'form-control', style: 'height: 24px; width: auto; padding: 2px 6px 0px 6px;' })
                                .text('Reset')
                                .click(this.#onResetVisibleAtZoomClick.bind(this))
                        ),
                        $('<div>').append(
                            $('<label>', { for: 'visible-at-zoom-input' }).text('Visible at zoom:'),
                            this.#visibleAtZoomInput = $('<input>', {
                                type: 'number',
                                id: 'visible-at-zoom-input',
                                min: this.#minVisibleAtZoom,
                                max: this.#maxVisibleAtZoom,
                                style: 'margin-left: 4px;'
                            }).change(v => this.#onVisibleAtZoomChange(v))
                        ),
                        $('<div>', { style: 'font-size: 13px; color: gray' }).text('Pan or zoom the map to refresh after changing.\n\nSetting this value too low may cause performance issues.')
                    )
                )
            ));

            this.hide();
            this._dialogDiv.appendTo('body');

            if (typeof jQuery.ui !== 'undefined') {
                const that = this;
                this._dialogDiv.draggable({
                    // Gotta nuke the height setting the dragging inserts otherwise the panel cannot dynamically resize
                    stop() { that._dialogDiv.css('height', ''); }
                });
            }
        }

        get gisLayer() {
            return this.#gisLayer;
        }

        set gisLayer(value) {
            if (value !== this.#gisLayer) {
                this.#gisLayer = value;
                this.#titleText.text(this.#gisLayer.name);
                this.#initVisibleAtZoomInput();
            }
        }

        #initVisibleAtZoomInput() {
            this.#visibleAtZoomInput.val(getGisLayerVisibleAtZoom(this.#gisLayer));
        }

        // eslint-disable-next-line class-methods-use-this
        getShiftAmount() {
            return $('input[name=gisLayerShiftAmt]:checked').val();
        }

        show() {
            this._dialogDiv.show();
        }

        hide() {
            this._dialogDiv.hide();
        }

        #onResetVisibleAtZoomClick() {
            settings.removeLayerSetting(this.#gisLayer.id, 'visibleAtZoom');
            this.#initVisibleAtZoomInput();
        }

        #onCloseButtonClick() {
            this.hide();
        }

        #onVisibleAtZoomChange() {
            const min = this.#minVisibleAtZoom;
            const max = this.#maxVisibleAtZoom;
            let value = parseInt(this.#visibleAtZoomInput.val(), 10);

            if (value < min) {
                value = min;
                this.#visibleAtZoomInput.val(value);
            } else if (value > max) {
                value = max;
                this.#visibleAtZoomInput.val(value);
            }

            settings.setLayerSetting(this.#gisLayer.id, 'visibleAtZoom', value);
            saveSettingsToStorage();
        }

        #onShiftButtonClick(x, y) {
            const shiftAmount = this.getShiftAmount();
            x *= shiftAmount;
            y *= shiftAmount;
            this.#shiftLayerFeatures(x, y);
            const { id } = this.gisLayer;
            let offset = settings.getLayerSetting(id, 'offset');
            if (!offset) {
                offset = { x: 0, y: 0 };
                settings.setLayerSetting(id, 'offset', offset);
            }
            offset.x += x;
            offset.y += y;
            saveSettingsToStorage();
        }

        #onResetOffsetButtonClick() {
            const offset = settings.getLayerSetting(this.gisLayer.id, 'offset');
            if (offset) {
                this.#shiftLayerFeatures(offset.x * -1, offset.y * -1);
                delete settings.layers[this.gisLayer.id].offset;
                saveSettingsToStorage();
            }
        }

        #shiftLayerFeatures(x, y) {
            const layer = this.gisLayer.isRoadLayer ? roadLayer : mapLayer;
            layer.getFeaturesByAttribute('layerID', this.gisLayer.id).forEach(f => f.geometry.move(x, y));
            layer.redraw();
        }

        static #createShiftButton(fontAwesomeClass) {
            return $('<button>', {
                class: 'form-control',
                style: 'cursor:pointer;font-size:14px;padding: 3px;border-radius: 5px;width: 21px;height: 21px;'
            }).append(
                $('<i>', { class: 'fa', style: 'vertical-align: super' }).addClass(fontAwesomeClass)
            );
        }
    }

    function loadSettingsFromStorage() {
        const defaultSettings = {
            lastVersion: null,
            visibleLayers: [],
            onlyShowApplicableLayers: false,
            selectedStates: [],
            enabled: true,
            fillParcels: false,
            oneTimeAlerts: {},
            layers: {},
            shortcuts: {},
            isPopupVisible: false,
            useAcronyms: false,
            useTitleCase: false,
            useStateHwy: false,
            removeNewLines: false
        };

        let loadedSettings = {}; // Initialize as an empty object
        const storedSettings = localStorage.getItem(SETTINGS_STORE_NAME);

        if (storedSettings) {
            try {
                const parsed = JSON.parse(storedSettings);
                if (parsed && typeof parsed === 'object') {
                    loadedSettings = parsed;
                } else {
                    logDebug(`Stored settings under key "${SETTINGS_STORE_NAME}" were not a valid object.`);
                }
            } catch (e) {
                logError(`Failed to parse settings from localStorage key "${SETTINGS_STORE_NAME}":`, e);
                // loadedSettings remains {}
            }
        }

        // Merge defaultSettings and loadedSettings.
        // If loadedSettings is empty (due to error or no storage), it effectively uses defaults.
        settings = { ...defaultSettings, ...loadedSettings };

        isPopupVisible = settings.isPopupVisible;
        useAcronyms = settings.useAcronyms;
        useTitleCase = settings.useTitleCase;
        useStateHwy = settings.useStateHwy;
        removeNewLines = settings.removeNewLines;

        settings.getLayerSetting = function getLayerSetting(layerID, settingName) {
            const layerSettings = this.layers[layerID];
            if (!layerSettings) {
                return undefined;
            }
            return layerSettings[settingName];
        };
        settings.setLayerSetting = function setLayerSetting(layerID, settingName, value) {
            let layerSettings = this.layers[layerID];
            if (!layerSettings) {
                layerSettings = {};
                this.layers[layerID] = layerSettings;
            }
            layerSettings[settingName] = value;
        };
        settings.removeLayerSetting = function removeLayerSetting(layerID, settingName) {
            const layerSettings = this.layers[layerID];
            if (layerSettings) {
                delete layerSettings[settingName];
            }
        };

        // Handle legacy shortcut keys settings.
        // TODO: Delete this later, after most users have updated.
        if (settings.toggleHnsOnlyShortcut) {
            settings.shortcuts.toggleHnsOnly = settings.toggleHnsOnlyShortcut;
            delete settings.toggleHnsOnlyShortcut;
        }
        if (settings.toggleEnabledShortcut) {
            settings.shortcuts.toggleEnabled = settings.toggleEnabledShortcut;
            delete settings.toggleEnabledShortcut;
        }
    }

    function saveSettingsToStorage() {
        settings.shortcuts = {};
        sdk.Shortcuts.getAllShortcuts().forEach(shortcut => {
            settings.shortcuts[shortcut.shortcutId] = shortcut.shortcutKeys;
        });
        settings.lastVersion = scriptVersion;
        settings.isPopupVisible = isPopupVisible;
        settings.useAcronyms = useAcronyms;
        settings.useTitleCase = useTitleCase;
        settings.useStateHwy = useStateHwy;
        settings.removeNewLines = removeNewLines;
        localStorage.setItem(SETTINGS_STORE_NAME, JSON.stringify(settings));
        logDebug('Settings saved');
    }

    function getUrl(extent, gisLayer) {
        // if (gisLayer.spatialReference) {
        //     const proj = new OpenLayers.Projection(`EPSG:${gisLayer.spatialReference}`);
        //     let new_extent = extent.clone();
        //     new_extent.transform(W.map.getProjectionObject(), proj); // do not transform original extent
        //     extent = new_extent;
        // }
        const layerOffset = settings.getLayerSetting(gisLayer.id, 'offset') ?? { x: 0, y: 0 };
        if (!layerOffset) {
            layerOffset = { x: 0, y: 0 };
        }
        const geometry = {
            xmin: extent[0] - layerOffset.x,
            ymin: extent[1] - layerOffset.y,
            xmax: extent[2] - layerOffset.x,
            ymax: extent[3] - layerOffset.y,
            spatialReference: {
                wkid: /* gisLayer.spatialReference ? gisLayer.spatialReference : */ 102100,
                latestWkid: /* gisLayer.spatialReference ? gisLayer.spatialReference : */ 3857
            }
        };
        const geometryStr = JSON.stringify(geometry);
        let fields = gisLayer.labelFields.filter(function (e) { return e != ""});
        if (gisLayer.labelHeaderFields) {
            fields = fields.concat(gisLayer.labelHeaderFields);
        }
        if (gisLayer.distinctFields) {
            fields = fields.concat(gisLayer.distinctFields);
        }
        let url = ""
        if (gisLayer.isFeatureSet) {
            url = gisLayer.url; // no extra filters for this resource (caching)
        } else if (gisLayer.serverType == "GeoNode"){
            url = gisLayer.url;
            url += `&CRS=EPSG:${geometry.spatialReference.latestWkid}`;
            if (gisLayer.where){
                var geom_field = gisLayer.cql_the_geom ? gisLayer.cql_the_geom : "the_geom"; //some geom fields are called simply 'geom'
                var where = `(bbox(${geom_field},${geometry.xmin},${geometry.ymin},${geometry.xmax},${geometry.ymax},'EPSG:${geometry.spatialReference.latestWkid}') and ${gisLayer.where})`;
                url += `&cql_filter=${encodeURIComponent(where)}`;
            } else {
                url += `&bbox=${geometry.xmin},${geometry.ymin},${geometry.xmax},${geometry.ymax},EPSG:${geometry.spatialReference.latestWkid}`;
            }
            url += `&srsName=EPSG:${geometry.spatialReference.latestWkid}&outputFormat=${gisLayer.output? gisLayer.output : "application/json"}`;
        } else if (gisLayer.serverType == "CartoDB"){
             // url with query format 'SELECT the_geom_webmercator AS the_geom FROM user.table_name'
            url =`${gisLayer.url} WHERE ST_Intersects(ST_SetSRID(ST_MakeBox2D(ST_Point(${extent.left},${extent.top}),ST_Point(${extent.right},${extent.bottom})),3857),the_geom_webmercator)`;
            if (fields.length){
                url = url.replace("the_geom_webmercator AS the_geom", `the_geom_webmercator AS the_geom%2C${encodeURIComponent(fields.join(','))}`)
            }
            if (gisLayer.where){
                url += `AND ${gisLayer.where}`;
            }
            url += '&format=GeoJSON'
        } else { //default ArcGIS server
            url = `${gisLayer.url}/query?geometry=${encodeURIComponent(geometryStr)}`;
            url += gisLayer.token ? `&token=${gisLayer.token}` : '';
            url += `&outFields=${encodeURIComponent(fields.join(','))}`;
            url += '&returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometryType=esriGeometryEnvelope';
            url += `&inSR=${/* gisLayer.spatialReference ? gisLayer.spatialReference : */ '102100'}`;
            url += '&outSR=3857&f=json';
            url += gisLayer.where ? `&where=${encodeURIComponent(gisLayer.where)}` : '';
        }

        logDebug(`Request URL: ${url}`);
        return url;
    }

    function hashString(value) {
        let hash = 0;
        if (value.length === 0) return hash;
        for (let i = 0; i < value.length; i++) {
            const chr = value.charCodeAt(i);
            // eslint-disable-next-line no-bitwise
            hash = ((hash << 5) - hash) + chr;
            // eslint-disable-next-line no-bitwise
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    function getMercatorMapExtent() {
        const wgs84Extent = sdk.Map.getMapExtent();
        const wgs84LeftBottom = [wgs84Extent[0], wgs84Extent[1]];
        const wgs84RightTop = [wgs84Extent[2], wgs84Extent[3]];
        const mercatorLeftBottom = turf.toMercator(wgs84LeftBottom);
        const mercatorRightTop = turf.toMercator(wgs84RightTop);
        return [mercatorLeftBottom[0], mercatorLeftBottom[1], mercatorRightTop[0], mercatorRightTop[1]];
    }

    function getArcGisMapExtentGeometry() {
        const extent = getMercatorMapExtent();
        const geometry = {
            xmin: extent[0],
            ymin: extent[1],
            xmax: extent[2],
            ymax: extent[3],
            spatialReference: {
                wkid: 102100,
                latestWkid: 3857
            }
        };
        return geometry;
    }


    function getCountiesUrl(extent) {
        const geometry = getArcGisMapExtentGeometry();
        const url = `${COUNTIES_URL2}/query?geometry=${encodeURIComponent(JSON.stringify(geometry))}`;
        return `${url}&outFields=NAME as BASENAME%2CCODE as STATE&returnGeometry=false&spatialRel=esriSpatialRelIntersects`
             + '&geometryType=esriGeometryEnvelope&inSR=102100&outSR=3857&f=json';
    }

    let _countiesInExtent = [];
    let _statesInExtent = [];

    function getGisLayerVisibleAtZoom(gisLayer) {
        const overrideVisibleAtZoom = settings.getLayerSetting(gisLayer.id, 'visibleAtZoom');
        if (overrideVisibleAtZoom) return overrideVisibleAtZoom;
        return (gisLayer.hasOwnProperty('visibleAtZoom')
            ? gisLayer.visibleAtZoom : DEFAULT_VISIBLE_AT_ZOOM);
    }

    function getGisLayerLabelsVisibleAtZoom(gisLayer, layerVisibleAtZoom) {
        let labelsVisibleAtZoom;
        layerVisibleAtZoom = +layerVisibleAtZoom;
        if (gisLayer.hasOwnProperty('labelsVisibleAtZoom')) {
            labelsVisibleAtZoom = layerVisibleAtZoom + (+gisLayer.labelsVisibleAtZoom - (+gisLayer.visibleAtZoom ?? DEFAULT_VISIBLE_AT_ZOOM));
        } else {
            labelsVisibleAtZoom = layerVisibleAtZoom + 1;
        }
        if (labelsVisibleAtZoom < 1) labelsVisibleAtZoom = 1;
        return labelsVisibleAtZoom;
    }

    function getFetchableLayers(getInvisible) {
        const zoom = sdk.Map.getZoomLevel();
        if (zoom < 12) return [];
        return _gisLayers.filter(gisLayer => {
            const isValidUrl = gisLayer.url && gisLayer.url.trim().length > 0;
            const isVisible = (getInvisible || settings.visibleLayers.includes(gisLayer.id))
                && settings.selectedStates.includes(gisLayer.state);
            const isInState = gisLayer.state === 'PRY' || _countiesInExtent.some(county => county.stateInfo[1] === gisLayer.state);
            // Be sure to use hasOwnProperty when checking this, since 0 is a valid value.
            const isValidZoom = getInvisible || zoom >= getGisLayerVisibleAtZoom(gisLayer);
            return isValidUrl && isInState && isVisible && isValidZoom;
        });
    }

    function filterLayerCheckboxes() {
        const applicableLayers = getFetchableLayers(true).filter(layer => {
            const hasCounties = layer.hasOwnProperty('counties');
            return (hasCounties && layer.counties.some(countyName => _countiesInExtent.some(county => county.name === countyName.toLowerCase()
              && layer.state === county.stateInfo[1]))) || !hasCounties;
        });
        const statesToHide = STATES.toAbbrArray();

        _gisLayers.forEach(gisLayer => {
            const id = `#gis-layer-${gisLayer.id}-container`;
            if (!settings.onlyShowApplicableLayers || applicableLayers.includes(gisLayer)) {
                $(id).show();
                $(`#gis-layers-for-${gisLayer.state}`).show();
                const idx = statesToHide.indexOf(gisLayer.state);
                if (idx > -1) statesToHide.splice(idx, 1);
            } else {
                $(id).hide();
            }
        });
        if (settings.onlyShowApplicableLayers) {
            statesToHide.forEach(st => $(`#gis-layers-for-${st}`).hide());
        }
    }

    function convertFeatureGeometry(gisLayer, featureGeometry) {
        if (gisLayer.spatialReference) {
            const proj = new OpenLayers.Projection(`EPSG:${gisLayer.spatialReference}`);
            featureGeometry.transform(proj, W.map.getProjectionObject());
        }
        return featureGeometry;
    }

    function setStateFullAddress() {
            if (document.getElementsByClassName("location-info")){
                var full = document.getElementsByClassName("location-info")[0];
                if (full != undefined){
                    var yy = full.innerText;
                    if (yy.includes("Paraguay")){
                        var deptos = _statesInExtent.join(', ');
                        yy = yy.replace(/\[.*\]/g, '');
                        yy += " [" + deptos + "]";
                        document.getElementsByClassName("location-info")[0].innerText = yy;
                    }
                }
            }
    }

    const ROAD_ABBR = [
        [/\bAVDA./gi, 'Av.'], [/\bAVENIDA/gi, 'Av.'], [/\bCOURT$/, 'CT'], [/\bDRIVE$/, 'DR'],
        [/\bLANE$/, 'LN'], [/\bPARK$/, 'PK'], [/\bPLACE$/, 'PL'], [/\bROAD$/, 'RD'], [/\bSTREET$/, 'ST'],
        [/\bTERRACE$/, 'TER']
    ];

    const labelProcessingGlobalVariables = {
        Number,
        Math,
        Boolean,
        parseInt,
        Date,
        _regexReplace: {
            // Strip leading zeros or blank full label for any label starting with a non-digit or
            // is a Zero Address, use with '' as replace.
            r0: /^(0+(\s.*)?|\D.*)/,
            // Strip Everything After Street Type to end of the string by use $1 and $2 capture
            // groups, use with replace '$1$2'
            // eslint-disable-next-line max-len
            r1: /^(.* )(Ave(nue)?|Dr(ive)?|St(reet)?|C(our)?t|Cir(cle)?|Blvd|Boulevard|Pl(ace)?|Ln|Lane|Fwy|Freeway|R(oa)?d|Ter(r|race)?|Tr(ai)?l|Way|Rte \d+|Route \d+)\b.*/gi,
            // Strip SPACE 5 Digits from end of string, use with replace ''
            r2: /\s\d{5}$/,
            // Strip Everything after a "~", ",", ";" to the end of the string, use with replace ''
            r3: /(~|,|;|\s?\r\n).*$/,
            // Move the digits after the last space to before the rest of the string using, use with
            // replace '$2 $1'
            r4: /^(.*)\s(\d+).*/,
            // Insert newline between digits (including "-") and everything after the digits,
            // except(and before) a ",", use with replace '$1\n$2'
            r5: /^([-\d]+)\s+([^,]+).*/,
            // Insert newline between digits and everything after the digits, use with
            // replace '$1\n$2'
            r6: /^(\d+)\s+(.*)/
        }
    };

    function processLabel(gisLayer, item, displayLabelsAtZoom, area, isPolyLine = false) {
        let label = '';
        let attrs = [];
        if (["GeoNode", "CartoDB"].indexOf(gisLayer.serverType) >= 0){
            attrs = item.properties;
        } else if (["RawPointData"].indexOf(gisLayer.serverType) >= 0) {
            attrs = item;
        } else {
            attrs = item.attributes;
        }
        if (gisLayer.labelHeaderFields) {
            label = `${gisLayer.labelHeaderFields.map(
                fieldName => attrs[fieldName]
            ).join(' ').trim()}\n`;
        }
        if (sdk.Map.getZoomLevel() >= displayLabelsAtZoom || area >= 5000) {
            label += gisLayer.labelFields.map(
                fieldName => attrs[fieldName]
            ).join(' ').trim();
            if (gisLayer.processLabel) {
                if (gisLayer.labelProcessingError) {
                    label = 'ERROR';
                } else {
                    labelProcessingGlobalVariables.label = label;
                    labelProcessingGlobalVariables.fieldValues = attrs;
                    const result = ESTreeProcessor.execute(gisLayer.processLabel, labelProcessingGlobalVariables);
                    label = result.output?.trim() ?? '';
                }
            }
        }

        if (!isPolyLine) {
            if (label && [
                LAYER_STYLES.points, LAYER_STYLES.parcels, LAYER_STYLES.state_points,
                LAYER_STYLES.state_parcels
            ].includes(gisLayer.style)) {
                if (settings.addrLabelDisplay === 'hn') {
                    const m = label.match(/^\d+/);
                    label = m ? m[0] : '';
                } else if (settings.addrLabelDisplay === 'street') {
                    const m = label.match(/^(?:\d+\s)?(.*)/);
                    label = m ? m[1].trim() : '';
                }
                else if (settings.addrLabelDisplay === 'none') {
                    label = '';
                }
            }
        }
        return label;
    }
    function processFeatures(data, token, gisLayer) {
        const features = [];
        if (data.skipIt) {
            // do nothing
        } else if (data.error) {
            logError(`Error in layer "${gisLayer.name}": ${data.error.message}`);
        } else {
            let items = {}
            if (gisLayer.isFeatureSet){
                // storing result as cache if not already there
                if (!sessionStorage.getItem(gisLayer.id)){
                    sessionStorage.setItem(gisLayer.id, JSON.stringify(data));
                }
                if (gisLayer.isFeatureSet == 1) {
                    items = data.layers[0].featureSet.features;
                } else if (gisLayer.isFeatureSet == 2){ // 2 is for GeoNode
                    items = data.features;
                } else if (gisLayer.isFeatureSet == 3){ // RawData
                    items = data;
                }
            } else {
                items = data.features || [];
            }
            if (!token.cancel) {
                let error = false;
                const distinctValues = [];
                items.forEach(item => {
                    let skipIt = false;
                    if (!token.cancel && !error) {
                        let feature;
                        let featureGeometry;
                        let area;
                        if (gisLayer.distinctFields) {
                            if (distinctValues.some(v => gisLayer.distinctFields.every(
                                fld => v[fld] === item.attributes[fld]
                            ))) {
                                skipIt = true;
                            } else {
                                const dist = {};
                                gisLayer.distinctFields.forEach(fld => (dist[fld] = item.attributes[fld]));
                                distinctValues.push(dist);
                            }
                        }
                        if (!skipIt) {
                            let isPolyLine = false;
                            const layerOffset = settings.getLayerSetting(gisLayer.id, 'offset') ?? { x: 0, y: 0 };
                            if (!item.geometry && ["RawPointData",].indexOf(gisLayer.serverType) >= 0){
                                item.geometry = "RawPointData"
                            }
                            if (item.geometry) {
                                if (item.geometry.x) {
                                    featureGeometry = new OpenLayers.Geometry.Point(
                                        item.geometry.x + layerOffset.x,
                                        item.geometry.y + layerOffset.y
                                    );
                                    // SDK
                                    // featureGeometry = turf.point([item.geometry.x + layerOffset.x, item.geometry.y + layerOffset.y]);
                                    // featureGeometry = turf.toWgs84(featureGeometry);
                                } else if (item.geometry.points) {
                                    // @TODO Fix for multiple points instead of just grabbing first.
                                    featureGeometry = new OpenLayers.Geometry.Point(
                                        item.geometry.points[0][0] + layerOffset.x,
                                        item.geometry.points[0][1] + layerOffset.y
                                    );
                                } else if (item.geometry.rings) {
                                    const rings = [];
                                    item.geometry.rings.forEach(ringIn => {
                                        const pnts = [];
                                        for (let i = 0; i < ringIn.length; i++) {
                                            pnts.push(new OpenLayers.Geometry.Point(
                                                ringIn[i][0] + layerOffset.x,
                                                ringIn[i][1] + layerOffset.y
                                            ));
                                        }
                                        rings.push(new OpenLayers.Geometry.LinearRing(pnts));
                                    });
                                    featureGeometry = new OpenLayers.Geometry.Polygon(rings);
                                    if (gisLayer.areaToPoint) {
                                        featureGeometry = featureGeometry.getCentroid();
                                    } else {
                                        area = featureGeometry.getArea();
                                    }
                                } else if (data.geometryType === 'esriGeometryPolyline') {
                                    // We have to handle polylines differently since each item can have multiple features.
                                    // In terms of ArcGIS, each feature's geometry can have multiple paths.  For instance
                                    // a single road can be broken into parts that are physically not connected to each other.

                                    const displayLabelsAtZoom = getGisLayerLabelsVisibleAtZoom(gisLayer, getGisLayerVisibleAtZoom(gisLayer));
                                    const label = processLabel(gisLayer, item, displayLabelsAtZoom, area, true);

                                    // Use Turf library to clip the geometry to the screen bounds.
                                    // This allows labels to stay in view on very long roads.
                                    const mls = turf.multiLineString(item.geometry.paths);
                                    const e = getMercatorMapExtent();
                                    const bbox = [e.left, e.bottom, e.right, e.top];
                                    const clipped = turf.bboxClip(mls, bbox);
                                    if (clipped.geometry.type === 'LineString') {
                                        item.geometry.paths = [clipped.geometry.coordinates];
                                    } else if (clipped.geometry.type === 'MultiLineString') {
                                        item.geometry.paths = clipped.geometry.coordinates;
                                    }

                                    item.geometry.paths.forEach(path => {
                                        const pointList = [];
                                        path.forEach(point => pointList.push(new OpenLayers.Geometry.Point(
                                            point[0] + layerOffset.x,
                                            point[1] + layerOffset.y
                                        )));
                                        featureGeometry = new OpenLayers.Geometry.LineString(pointList);
                                        featureGeometry.skipDupeCheck = true;

                                        const attributes = {
                                            layerID: gisLayer.id,
                                            label
                                        };

                                        const lineFeature = new OpenLayers.Feature.Vector(featureGeometry, attributes);
                                        features.push(lineFeature);
                                        if (isPopupVisible) {
                                            addLabelToLayer(gisLayer.name, label);
                                        }
                                    });
                                    isPolyLine = true;
                                } else if (["GeoNode", "CartoDB"].indexOf(gisLayer.serverType) >= 0){
                                    if (item.geometry.type == "GeometryCollection") {
                                        let props = item.properties;
                                        item = item.geometry.geometries[0];
                                        item.geometry = item;
                                        item.properties = props;
                                    }
                                    if (item.geometry.type == "Point") {
                                        featureGeometry = new OpenLayers.Geometry.Point(
                                            item.geometry.coordinates[0] + layerOffset.x,
                                            item.geometry.coordinates[1] + layerOffset.y
                                        );
                                    } else if (item.geometry.type == "MultiPoint") {
                                        const rings = [];
                                        const pnts = [];
                                        item.geometry.coordinates.forEach(ringIn => {
                                            pnts.push(new OpenLayers.Geometry.Point(
                                                ringIn[0] + layerOffset.x,
                                                ringIn[1] + layerOffset.y
                                            ));
                                        });
                                        rings.push(new OpenLayers.Geometry.LinearRing(pnts));
                                        featureGeometry = new OpenLayers.Geometry.Polygon(rings);
                                    } else if (item.geometry.type == "Polygon") {
                                        const rings = [];
                                        item.geometry.coordinates.forEach(ringIn => {
                                            const pnts = [];
                                            for (let i = 0; i < ringIn.length; i++) {
                                                pnts.push(new OpenLayers.Geometry.Point(
                                                    ringIn[i][0] + layerOffset.x,
                                                    ringIn[i][1] + layerOffset.y
                                                ));
                                            }
                                            rings.push(new OpenLayers.Geometry.LinearRing(pnts));
                                        });
                                        featureGeometry = new OpenLayers.Geometry.Polygon(rings);
                                        if (gisLayer.areaToPoint) {
                                            featureGeometry = featureGeometry.getCentroid();
                                        } else {
                                            area = featureGeometry.getArea();
                                        }
                                    } else if (item.geometry.type == "MultiPolygon") {
                                        const source = item.geometry.coordinates[0];
                                        const polygonList = [];
                                        for (var i = 0; i < source.length; i += 1) {
                                            const pointList = [];
                                            for (var j = 0; j < source[i].length; j += 1) {
                                                var point = new OpenLayers.Geometry.Point(
                                                    source[i][j][0],
                                                    source[i][j][1]
                                                );
                                                pointList.push(point);
                                            }
                                            var linearRing = new OpenLayers.Geometry.LinearRing(pointList);
                                            var polygon = new OpenLayers.Geometry.Polygon([linearRing]);
                                            polygonList.push(polygon);
                                        }
                                        featureGeometry = new OpenLayers.Geometry.MultiPolygon(polygonList);
                                    } else if (item.geometry.type == "MultiLineString") {
                                        const pointList = [];
                                        item.geometry.coordinates.forEach(path => {
                                            path.forEach(point => pointList.push(new OpenLayers.Geometry.Point(
                                                point[0] + layerOffset.x,
                                                point[1] + layerOffset.y
                                            )));
                                        });
                                        featureGeometry = new OpenLayers.Geometry.LineString(pointList);
                                        featureGeometry.skipDupeCheck = true;
                                    } else if (item.geometry.type == "LineString") {
                                        const pointList = [];
                                        item.geometry.coordinates.forEach(point => {
                                            pointList.push(new OpenLayers.Geometry.Point(
                                                point[0] + layerOffset.x,
                                                point[1] + layerOffset.y
                                            ));
                                        });
                                        featureGeometry = new OpenLayers.Geometry.LineString(pointList);
                                    }
                                    featureGeometry = convertFeatureGeometry(gisLayer, featureGeometry);
                                } else if (["RawPointData",].indexOf(gisLayer.serverType) >= 0){
                                    featureGeometry = new OpenLayers.Geometry.Point(item[`${gisLayer.processLon}`] + layerOffset.x, item[`${gisLayer.processLat}`] + layerOffset.y);
                                    featureGeometry = convertFeatureGeometry(gisLayer, featureGeometry);
                                } else {
                                    logDebug(`Unexpected feature type in layer: ${JSON.stringify(item)}`);
                                    logError(`Error: Unexpected feature type in layer "${gisLayer.name}"`);
                                    error = true;
                                }
                                if (!error && !isPolyLine && featureGeometry) {
                                    const displayLabelsAtZoom = getGisLayerLabelsVisibleAtZoom(gisLayer, getGisLayerVisibleAtZoom(gisLayer));
                                    const label = processLabel(gisLayer, item, displayLabelsAtZoom, area);
                                    const attributes = {
                                        layerID: gisLayer.id,
                                        label
                                    };
                                    // SDK
                                    // featureGeometry.id = gisLayer.id;
                                    // featureGeometry.properties = attributes;
                                    // features.push(featureGeometry);
                                    feature = new OpenLayers.Feature.Vector(featureGeometry, attributes);
                                    features.push(feature);
                                    if (isPopupVisible) {
                                        addLabelToLayer(gisLayer.name, label);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
        if (!token.cancel) {
            // Check for duplicate geometries.
            for (let i = 0; i < features.length; i++) {
                const f1 = features[i];
                let labels = [f1.attributes.label];
                if (!f1.geometry.skipDupeCheck) {
                    const c1 = f1.geometry.getCentroid();

                    for (let j = i + 1; j < features.length; j++) {
                        const f2 = features[j];
                        if (!f2.geometry.skipDupeCheck && f2.geometry.getCentroid().distanceTo(c1) < 1) {
                            features.splice(j, 1);
                            labels.push(f2.attributes.label);
                            j--;
                        }
                    }
                    labels = _.uniq(labels);
                    if (labels.length > 1) {
                        labels.forEach((label, idx) => {
                            label = label.replace(/\n/g, ' ').replace(/\s{2,}/, ' ').replace(/\bUNIT\s.{1,5}$/i, '').trim();
                            ROAD_ABBR.forEach(abbr => (label = label.replace(abbr[0], abbr[1])));
                            labels[idx] = label;
                        });
                        labels = _.uniq(labels);
                        labels.sort();
                        if (labels.length > 12) {
                            const len = labels.length;
                            labels = labels.slice(0, 10);
                            labels.push(`(${len - 10} more...)`);
                        }
                        f1.attributes.label = _.uniq(labels).join('\n');
                    } else {
                        let { label } = f1.attributes;
                        ROAD_ABBR.forEach(abbr => (label = label.replace(abbr[0], abbr[1])));
                        f1.attributes.label = label;
                    }
                }
            }

            // SDK: Swap this when ready.
            const layer = gisLayer.isRoadLayer ? roadLayer : mapLayer;
            layer.removeFeatures(layer.getFeaturesByAttribute('layerID', gisLayer.id));
            layer.addFeatures(features);
            // sdk.Map.removeFeaturesFromLayer({ layerName: layer.name, featureIds: [gisLayer.id] });
            // sdk.Map.addFeaturesToLayer({ layerName: layer.name, features });

            if (features.length) {
                $(`label[for="gis-layer-${gisLayer.id}"]`).css({ color: '#00a009' });
            }
        }
    } // END processFeatures()

    function copyTextToClipboard(text) {
        try {
            GM_setClipboard(text);
            logDebug(`Copy Text To Clipboard: ${text}`);
        } catch (err) {
            logError(`Failed to Text To Clipboard: ${err}`);
        }
    }

    function addLabelToLayer(layerName, label) {
        if (!layerLabels[layerName]) {
            layerLabels[layerName] = new Set();
        }
        layerLabels[layerName].add(label);
    }

    function replacePhrasesWithAcronyms(text) {
    // Order phrases such that compound phrases come before individual words
        const replacements = [
            // compound phrases here
            { phrase: 'Alternate Route', acronym: 'ALT' },
            { phrase: 'Army Air Field', acronym: 'AAF' },
            { phrase: 'County Highway', acronym: 'CH-' },
            { phrase: 'County Road', acronym: 'CR-' },
            { phrase: 'East Bound', acronym: 'EB' },
            { phrase: 'North Bound', acronym: 'NB' },
            { phrase: 'North East', acronym: 'NE' },
            { phrase: 'North West', acronym: 'NW' },
            { phrase: 'South Bound', acronym: 'SB' },
            { phrase: 'South East', acronym: 'SE' },
            { phrase: 'South West', acronym: 'SW' },
            { phrase: 'State Highway', acronym: 'SH-' },
            { phrase: 'State Route', acronym: 'SR-' },
            { phrase: 'State Rte', acronym: 'SR-' },
            { phrase: 'U.S. Highway', acronym: 'US-' },
            { phrase: 'U.S. Route', acronym: 'US-' },
            { phrase: 'U.S. Rte', acronym: 'US-' },
            { phrase: 'U.S.Rte', acronym: 'US-' },
            { phrase: 'US Highway', acronym: 'US-' },
            { phrase: 'U S Highway', acronym: 'US-' },
            { phrase: 'US Route', acronym: 'US-' },
            { phrase: 'U S Route', acronym: 'US-' },
            { phrase: 'US RTE', acronym: 'US-' },
            { phrase: 'U S RTE', acronym: 'US-' },
            { phrase: 'USRTE', acronym: 'US-' },
            { phrase: 'West Bound', acronym: 'WB' },
            // Start of single words list
            { phrase: 'Alley', acronym: 'Aly' },
            { phrase: 'Apartments', acronym: 'Apts' },
            { phrase: 'Avenue', acronym: 'Ave' },
            { phrase: 'Beach', acronym: 'Bch' },
            { phrase: 'Boulevard', acronym: 'Blvd' },
            { phrase: 'Bridge', acronym: 'Br' },
            { phrase: 'Business', acronym: 'BUS' },
            { phrase: 'Bypass', acronym: 'BYP' },
            { phrase: 'Canyon', acronym: 'Cyn' },
            { phrase: 'Captain', acronym: 'Capt' },
            { phrase: 'Causeway', acronym: 'Cswy' },
            { phrase: 'Center', acronym: 'Ctr' },
            { phrase: 'Circle', acronym: 'Cir' },
            { phrase: 'Colonel', acronym: 'Col.' },
            { phrase: 'Commander', acronym: 'Cmdr.' },
            { phrase: 'Connector', acronym: 'CONN' },
            { phrase: 'Corners', acronym: 'Cors' },
            { phrase: 'Corporal', acronym: 'Cpl.' },
            { phrase: 'Court', acronym: 'Ct' },
            { phrase: 'Cove', acronym: 'Cv' },
            { phrase: 'Creek', acronym: 'Crk' },
            { phrase: 'Crescent', acronym: 'Cres' },
            { phrase: 'Crossing', acronym: 'X-ing' },
            { phrase: 'Doctor', acronym: 'Dr.' },
            { phrase: 'Drive', acronym: 'Dr' },
            { phrase: 'East', acronym: 'E' },
            { phrase: 'Eastbound', acronym: 'EB' },
            { phrase: 'Eb', acronym: 'EB' },
            { phrase: 'Express', acronym: 'EXP' },
            { phrase: 'Expressway', acronym: 'Expwy' },
            { phrase: 'Extension', acronym: 'Ext' },
            { phrase: 'Fort', acronym: 'Ft.' },
            { phrase: 'Freeway', acronym: 'Fwy' },
            { phrase: 'General', acronym: 'Gen.' },
            { phrase: 'Governor', acronym: 'Gov.' },
            { phrase: 'Grove', acronym: 'Grv' },
            { phrase: 'Heights', acronym: 'Hts' },
            { phrase: 'Highway', acronym: 'Hwy' },
            { phrase: 'Honerable', acronym: 'Hon.' },
            { phrase: 'International', acronym: 'Intl' },
            { phrase: 'Interstate', acronym: 'I-' },
            { phrase: 'Junior', acronym: 'Jr.' },
            { phrase: 'Landing', acronym: 'Lndg' },
            { phrase: 'Lane', acronym: 'Ln' },
            { phrase: 'Lieutenant', acronym: 'Lt.' },
            { phrase: 'Loop', acronym: 'Lp' },
            { phrase: 'Major', acronym: 'Maj.' },
            { phrase: 'Manor', acronym: 'Mnr.' },
            { phrase: 'Meadow', acronym: 'Mdw' },
            { phrase: 'Mount', acronym: 'Mt' },
            { phrase: 'Mountain', acronym: 'Mtn' },
            { phrase: 'Mountains', acronym: 'Mtns' },
            { phrase: 'National', acronym: "Nat'l" },
            { phrase: 'North', acronym: 'N' },
            { phrase: 'Northbound', acronym: 'NB' },
            { phrase: 'Nb', acronym: 'NB' },
            { phrase: 'Northeast', acronym: 'NE' },
            { phrase: 'Northwest', acronym: 'NW' },
            { phrase: 'Park', acronym: 'Pk' },
            { phrase: 'Parkway', acronym: 'Pkwy' },
            { phrase: 'Parkways', acronym: 'Pkwys' },
            { phrase: 'Passage', acronym: 'Psge' },
            { phrase: 'Place', acronym: 'Pl' },
            { phrase: 'Plaza', acronym: 'Plz' },
            { phrase: 'Point', acronym: 'Pt' },
            { phrase: 'Points', acronym: 'Pts' },
            { phrase: 'President', acronym: 'Pres.' },
            { phrase: 'Professor', acronym: 'Prof.' },
            { phrase: 'Railroad', acronym: 'R.R.' },
            { phrase: 'Road', acronym: 'Rd' },
            { phrase: 'Recreational', acronym: 'Rec.' },
            { phrase: 'Reverend', acronym: 'Rev.' },
            { phrase: 'Route', acronym: 'SR-' },
            { phrase: 'Saint', acronym: 'St.' },
            { phrase: 'Sainte', acronym: 'Ste.' },
            { phrase: 'Senior', acronym: 'Sr.' },
            { phrase: 'Sergeant', acronym: 'Sgt.' },
            { phrase: 'Skyway', acronym: 'Skwy' },
            { phrase: 'South', acronym: 'S' },
            { phrase: 'Southbound', acronym: 'SB' },
            { phrase: 'Sb', acronym: 'SB' },
            { phrase: 'Southeast', acronym: 'SE' },
            { phrase: 'Southwest', acronym: 'SW' },
            { phrase: 'Springs', acronym: 'Spgs' },
            { phrase: 'Square', acronym: 'Sq' },
            { phrase: 'Station', acronym: 'Sta' },
            { phrase: 'Street', acronym: 'St' },
            { phrase: 'Terrace', acronym: 'Ter' },
            { phrase: 'Throughway', acronym: 'Thwy' },
            { phrase: 'Thruway', acronym: 'Thwy' },
            { phrase: 'Tollway', acronym: 'Tlwy' },
            { phrase: 'Township', acronym: 'Twp' },
            { phrase: 'Trafficway', acronym: 'Trfy' },
            { phrase: 'Trail', acronym: 'Trl' },
            { phrase: 'Tunnel', acronym: 'Tun' },
            { phrase: 'Turnpike', acronym: 'Tpk' },
            { phrase: 'Upper', acronym: 'Upr' },
            { phrase: 'U.S.', acronym: 'US' },
            { phrase: 'Valley', acronym: 'Vly' },
            { phrase: 'West', acronym: 'W' },
            { phrase: 'Westbound', acronym: 'WB' },
            { phrase: 'Wb', acronym: 'WB' },
            { phrase: '--', acronym: '-' },
            { phrase: ' -', acronym: '-' },
            { phrase: '- ', acronym: '-' },
            { phrase: '- -', acronym: '-' }
        ];

        let updatedText = text;

        // Replace phrases with their acronyms, case insensitive
        replacements.forEach(({ phrase, acronym }) => {
            const regex = new RegExp(`\\b${phrase}\\b`, 'gi'); // Uses \\b to match words with word boundaries
            updatedText = updatedText.replace(regex, acronym);
        });

        return updatedText;
    }

    function fixSateHwyRoadNames(text) {
    // Regular expression to capture patterns like "XXX ###", "XXX-###", "XXX###", as well as "Us Route #", "Us Rte #", and "Route #", "Rte #"
        const regex = /(?:([A-Z]{1,3})[-\s]?(\d{1,3})|(?:Us\s+(?:Rte|Route)\s+(\d{1,3}))|(?:Rte[-\s]?(\d{1,3})|Route\s+(\d{1,3})))\b/gi;

        // Replacement function formats matched patterns
        return text.replace(regex, (match, letters, numbers, usRouteNumber, rteNumber, routeNumber) => {
            if (usRouteNumber) {
                return `US-${usRouteNumber}`; // for "US Route"/s
            }
            if (rteNumber || routeNumber) {
                return `SR-${rteNumber || routeNumber}`; // Change "Rte" or "Route" to "SR"
            }
            if (letters && numbers) {
                return `${letters.toUpperCase()}-${numbers}`; // General format for other letter-number combos
            }
            return match;
        });
    }

    function titleCaseLabel(text) {
    // Read each line separately
        const lines = text.split('\n');
        return lines
            .map(line => {
                const trimmedLine = line.trim(); // Trim the line to remove leading/trailing spaces
                const words = trimmedLine.split(' '); // Split the line into individual words
                // Capitalize the first letter of each word and convert the rest to lowercase
                const titleCasedLine = words
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' '); // Recombine the words into a title-cased line
                return titleCasedLine; // Return the formatted line
            })
            .join('\n'); // Combine all the lines back into a single string separated by new lines
    }

    function processedLabel(label) {
        if (useTitleCase) {
            label = titleCaseLabel(label);
        }
        if (useAcronyms) {
            label = replacePhrasesWithAcronyms(label);
        }
        if (useStateHwy) {
            label = fixSateHwyRoadNames(label);
        }
        if (removeNewLines) {
            label = label.replace(/[\r\n]+/g, ' ');
        }
        return label;
    }

    function updatePopup(labels) {
        let popup = document.getElementById('layerLabelPopup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'layerLabelPopup';
            popup.style = `position: absolute; background: #f5f5f5; border: 2px solid #007bff; border-radius: 5px; 
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); z-index: 1000; width: 500px; max-width: 800px;
                height: 300px; resize: both; overflow: hidden; max-height: 700px; left: ${popupPosition.left}; top: ${popupPosition.top}; `;

            const header = document.createElement('div');
            header.style = 'background: #007bff; color: #fff; padding: 5px; cursor: move; border-radius: 3px 3px 0 0; display: flex; justify-content: space-between; align-items: center; height: 30px; ';

            const title = document.createElement('span');
            title.innerText = 'GIS-L Layer Labels';
            header.appendChild(title);

            const closeButton = document.createElement('span');
            closeButton.innerText = '×';
            closeButton.style = 'cursor: pointer; font-size: 20px; margin-left: 10px; ';
            closeButton.addEventListener('click', () => {
                isPopupVisible = false;
                togglePopupVisibility();
                $('input[name="popupVisibility"][value="show"]').prop('checked', isPopupVisible);
                $('input[name="popupVisibility"][value="hide"]').prop('checked', !isPopupVisible);
                saveSettingsToStorage();
            });
            header.appendChild(closeButton);
            popup.appendChild(header);

            const formatOptionContainer = document.createElement('div');
            formatOptionContainer.style = 'background: #72767d; color: #fff;';

            const firstRow = document.createElement('div');
            firstRow.style = 'display: flex; gap: 10px; align-items: flex-start; justify-content: flex-start;';

            const formatCheckbox = document.createElement('input');
            formatCheckbox.type = 'checkbox';
            formatCheckbox.id = 'useTitleCaseCheckbox';
            formatCheckbox.style = 'margin-left: 10px';
            formatCheckbox.checked = useTitleCase;
            formatCheckbox.addEventListener('change', () => {
                useTitleCase = formatCheckbox.checked;
                updatePopupContent(labels);
                saveSettingsToStorage();
            });
            firstRow.appendChild(formatCheckbox);

            const formatCheckboxLabel = document.createElement('label');
            formatCheckboxLabel.htmlFor = 'useTitleCaseCheckbox';
            formatCheckboxLabel.innerText = 'Use Title Case';
            formatCheckboxLabel.style = 'font-weight: 100; width: 150px;';
            firstRow.appendChild(formatCheckboxLabel);

            const acronymCheckbox = document.createElement('input');
            acronymCheckbox.type = 'checkbox';
            acronymCheckbox.id = 'useacronymsCheckbox';
            acronymCheckbox.checked = useAcronyms;
            acronymCheckbox.addEventListener('change', () => {
                useAcronyms = acronymCheckbox.checked;
                updatePopupContent(labels);
                saveSettingsToStorage();
            });
            firstRow.appendChild(acronymCheckbox);

            const acronymCheckboxLabel = document.createElement('label');
            acronymCheckboxLabel.htmlFor = 'useacronymsCheckbox';
            acronymCheckboxLabel.innerText = 'Use Acronyms & Abbreviations';
            acronymCheckboxLabel.style = 'font-weight: 100;';
            firstRow.appendChild(acronymCheckboxLabel);
            formatOptionContainer.appendChild(firstRow);

            const secondRow = document.createElement('div');
            secondRow.style = 'display: flex; gap: 10px; align-items: flex-start; justify-content: flex-start;';

            const stateHwyCheckbox = document.createElement('input');
            stateHwyCheckbox.type = 'checkbox';
            stateHwyCheckbox.id = 'useStateHwyCheckbox';
            stateHwyCheckbox.style = 'margin-left: 10px';
            stateHwyCheckbox.checked = useStateHwy;
            stateHwyCheckbox.addEventListener('change', () => {
                useStateHwy = stateHwyCheckbox.checked;
                updatePopupContent(labels);
                saveSettingsToStorage();
            });
            secondRow.appendChild(stateHwyCheckbox);

            const stateHwyCheckboxLabel = document.createElement('label');
            stateHwyCheckboxLabel.htmlFor = 'useStateHwyCheckbox';
            stateHwyCheckboxLabel.innerText = 'Fix Highway Labels';

            stateHwyCheckboxLabel.style = 'font-weight: 100; width: 150px;';
            secondRow.appendChild(stateHwyCheckboxLabel);

            const removeNewLinesCheckbox = document.createElement('input');
            removeNewLinesCheckbox.type = 'checkbox';
            removeNewLinesCheckbox.id = 'removeNewLinesCheckbox';
            removeNewLinesCheckbox.checked = removeNewLines;
            removeNewLinesCheckbox.addEventListener('change', () => {
                removeNewLines = removeNewLinesCheckbox.checked;
                updatePopupContent(labels);
                saveSettingsToStorage();
            });
            secondRow.appendChild(removeNewLinesCheckbox);

            const removeNewLinesCheckboxLabel = document.createElement('label');
            removeNewLinesCheckboxLabel.htmlFor = 'removeNewLinesCheckbox';
            removeNewLinesCheckboxLabel.innerText = 'Remove New Lines';
            removeNewLinesCheckboxLabel.style = 'font-weight: 100;';
            secondRow.appendChild(removeNewLinesCheckboxLabel);

            formatOptionContainer.appendChild(secondRow);
            popup.appendChild(formatOptionContainer);

            const dropdownContainer = document.createElement('div');
            dropdownContainer.style = 'margin-bottom: 10px;';
            popup.appendChild(dropdownContainer);

            const contentContainer = document.createElement('div');
            contentContainer.style = 'padding: 5px; overflow-y: auto; overflow-x: auto; height: calc(100% - 110px);';
            popup.appendChild(contentContainer);

            const mapElement = document.getElementsByTagName('wz-page-content')[0];
            if (mapElement) {
                mapElement.appendChild(popup);
            }

            header.onmousedown = function(event) {
                event.preventDefault();
                const parentRect = mapElement.getBoundingClientRect();
                const initialX = event.clientX;
                const initialY = event.clientY;
                const offsetX = initialX - parentRect.left - popup.offsetLeft;
                const offsetY = initialY - parentRect.top - popup.offsetTop;

                document.onmousemove = function(ev) {
                    popup.style.left = `${ev.clientX - offsetX - parentRect.left}px`;
                    popup.style.top = `${ev.clientY - offsetY - parentRect.top}px`;

                    popupPosition.left = popup.style.left;
                    popupPosition.top = popup.style.top;
                };

                document.onmouseup = function() {
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
        }

        updatePopupContent(labels);
        popup.style.display = isPopupVisible ? 'block' : 'none';
    }

    function updatePopupContent(labels) {
        const dropdownContainer = document.querySelector('#layerLabelPopup div:nth-child(3)');
        const contentContainer = document.querySelector('#layerLabelPopup div:nth-child(4)');

        dropdownContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        const select = document.createElement('select');
        select.style = 'width: 100%; padding: 5px; border: 1px solid #ccc;';

        const sortedLayerNames = Object.keys(labels).sort();
        sortedLayerNames.forEach(layerName => {
            const option = document.createElement('option');
            option.value = layerName;
            option.innerText = layerName;
            select.appendChild(option);

            const uniqueLabels = Array.from(labels[layerName]).sort();
            const tabContent = document.createElement('div');
            tabContent.style = 'display: none; width: 100%; white-space: pre;';

            const processedLabels = uniqueLabels
                .map(label => {
                    const text = processedLabel(label);
                    const copyIcon = '<span style="cursor: pointer; margin-left: 5px;" title="Copy to clipboard">📋</span>';
                    return `<li style="margin-bottom: 0.3em; color: #555;" data-label="${text}">${text}${copyIcon}</li>`;
                })
                .join('');

            tabContent.innerHTML = `<ul style="padding-left: 20px; margin-top: 0;">${processedLabels}</ul>`;
            contentContainer.appendChild(tabContent);

            // Add copying functionality
            tabContent.querySelectorAll('li').forEach(li => {
                const icon = li.querySelector('span');
                if (icon) {
                    icon.addEventListener('click', () => {
                        const textToCopy = li.getAttribute('data-label'); // Get the text from a custom data attribute
                        copyTextToClipboard(textToCopy);
                    });
                }
            });
        });

        dropdownContainer.appendChild(select);

        let selectedLayerIndex = sortedLayerNames.indexOf(popupActiveLayer);

        if (selectedLayerIndex === -1 && select.options.length > 0) {
            selectedLayerIndex = 0;
            popupActiveLayer = sortedLayerNames[selectedLayerIndex];
        }
        select.selectedIndex = selectedLayerIndex;

        const allContents = contentContainer.querySelectorAll('div');
        allContents.forEach((content, index) => {
            content.style.display = index === select.selectedIndex ? 'block' : 'none';
        });

        select.addEventListener('change', () => {
            const contents = contentContainer.querySelectorAll('div');
            contents.forEach((content, index) => {
                content.style.display = index === select.selectedIndex ? 'block' : 'none';
            });
            popupActiveLayer = select.value;
        });
    }

    function fetchFeatures() {
        if (!settings.enabled) return;
        if (isPopupVisible) {
            Object.keys(layerLabels).forEach(key => delete layerLabels[key]);
        }
        if (ignoreFetch) return;
        if (sdk.Map.getZoomLevel() < 12) {
            filterLayerCheckboxes();
            return;
        }
        lastToken.cancel = true;
        lastToken = { cancel: false, features: [], layersProcessed: 0 };
        $('.gis-state-layer-label').css({ color: '#777' });

        let _layersCleared = false;

        // if (layersToFetch.length) {
        const extent = getMercatorMapExtent();
        GM_xmlhttpRequest({
            url: getCountiesUrl(extent),
            method: 'GET',
            onload(res) {
                if (res.status < 400) {
                    const data = $.parseJSON(res.responseText);
                    if (data.error) {
                        logError(`Error in PY Census counties data: ${data.error.message}`);
                    } else {
                        _countiesInExtent = data.features.map(feature => {
                            const name = feature.attributes.BASENAME.toLowerCase();
                            const stateInfo = STATES.fromId(parseInt(feature.attributes.STATE, 10));
                            return { name, stateInfo };
                        });
                        logDebug(`PY Census counties: ${_countiesInExtent.map(c => `${c.name} ${c.stateInfo[1]}`).join(', ')}`);
                        _statesInExtent = _.uniq(data.features.map(
                            // eslint-disable-next-line radix
                            feature => STATES.fromId(parseInt(feature.attributes.STATE, 10))[0]
                        ));
                        setStateFullAddress();
                        let layersToFetch;
                        if (!_layersCleared) {
                            _layersCleared = true;
                            layersToFetch = getFetchableLayers();

                            // Remove features of any layers that won't be mapped.
                            _gisLayers.forEach(gisLayer => {
                                if (!layersToFetch.includes(gisLayer)) {
                                    mapLayer.removeFeatures(mapLayer.getFeaturesByAttribute('layerID', gisLayer.id));
                                    roadLayer.removeFeatures(roadLayer.getFeaturesByAttribute('layerID', gisLayer.id));
                                }
                            });
                        }

                        layersToFetch = layersToFetch.filter(layer => !layer.hasOwnProperty('counties')
                          || layer.counties.some(countyName => _countiesInExtent.some(county => county.name === countyName.toLowerCase()
                              && layer.state === county.stateInfo[1])));
                        filterLayerCheckboxes();
                        logDebug(`Fetching ${layersToFetch.length} layers...`);
                        logDebug(layersToFetch);
                        let layersProcessedCount = 0; // Track processed layers

                        layersToFetch.forEach(gisLayer => {
                            const url = getUrl(extent, gisLayer);
                            if (gisLayer.isFeatureSet){ // trying to retrieve cached data from sessionStorage
                                let sessionValue = sessionStorage.getItem(gisLayer.id);
                                if (sessionValue){
                                    logDebug(`Processing features of ${gisLayer.id} from storage (RawData)...`);
                                    processFeatures($.parseJSON(sessionValue), {}, gisLayer);
                                    return;
                                }
                            }
                            GM_xmlhttpRequest({
                                url,
                                context: lastToken,
                                method: 'GET',
                                headers: (gisLayer.customHeaders) ? $.parseJSON(gisLayer.customHeaders): {},
                                onload(res2) {
                                    if (res2.status < 400) { // Handle stupid issue where http 4## is considered success
                                        processFeatures($.parseJSON(res2.responseText), res2.context, gisLayer);
                                        // Update the popup only after all layers have been processed
                                        layersProcessedCount += 1;
                                        if (layersProcessedCount === layersToFetch.length && isPopupVisible) {
                                            updatePopup(layerLabels);
                                        }
                                    } else {
                                        logDebug(`HTTP request error: ${JSON.stringify(res2)}`);
                                        logError(`Could not fetch layer "${gisLayer.id}". Request returned ${res2.status}`);
                                    }
                                },
                                onerror(res3) {
                                    logDebug(`xmlhttpRequest error:${JSON.stringify(res3)}`);
                                    logError(`Could not fetch layer "${gisLayer.id}". An error was thrown.`);
                                }
                            });
                        });
                    }
                } else {
                    logDebug(`HTTP request error: ${JSON.stringify(res)}`);
                    logError(`Could not fetch counties from PY Census site.  Request returned ${res.status}`);
                }
            },
            onerror(res) {
                logDebug(`xmlhttpRequest error:${JSON.stringify(res)}`);
                logError('Could not fetch counties from PY Census site.  An error was thrown.');
            }
        });
    }

    function showScriptInfoAlert() {
        /* Check version and alert on update */
        if (SHOW_UPDATE_MESSAGE && scriptVersion !== settings.lastVersion) {
            // alert(SCRIPT_VERSION_CHANGES);
            let releaseNotes = '';
            releaseNotes += '<p>What\'s New:</p>';
            if (SCRIPT_VERSION_CHANGES.length > 0) {
                releaseNotes += '<ul>';
                for (let idx = 0; idx < SCRIPT_VERSION_CHANGES.length; idx++)
                    releaseNotes += `<li>${SCRIPT_VERSION_CHANGES[idx]}`;
                releaseNotes += '</ul>';
            }
            else {
                releaseNotes += '<ul><li>Nothing major.</ul>';
            }
            WazeWrap.Interface.ShowScriptUpdate(GM_info.script.name, scriptVersion, releaseNotes, GF_URL);
        }
    }

    function setEnabled(value) {
        settings.enabled = value;
        saveSettingsToStorage();
        mapLayer.setVisibility(value);
        roadLayer.setVisibility(value);
        const color = value ? '#00bd00' : '#ccc';
        $('span#gis-layers-power-btn').css({ color });
        if (value) fetchFeatures();
        sdk.LayerSwitcher.setLayerCheckboxChecked({ name: 'PY GIS Layers', isChecked: value });

        // Show/hide the popup based on the enabled state
        const popup = document.getElementById('layerLabelPopup');
        if (popup) {
            popup.style.display = value ? 'block' : 'none';
            isPopupVisible = value;
        }
    }

    function onGisLayerToggleChanged() {
        const checked = $(this).is(':checked');
        const layerId = $(this).data('layer-id');
        const idx = settings.visibleLayers.indexOf(layerId);
        if (checked) {
            const gisLayer = _gisLayers.find(l => l.id === layerId);
            if (gisLayer.oneTimeAlert) {
                const lastAlertHash = settings.oneTimeAlerts[layerId];
                const newAlertHash = hashString(gisLayer.oneTimeAlert);
                if (lastAlertHash !== newAlertHash) {
                    // alert(`Layer: ${gisLayer.name}\n\nMessage:\n${gisLayer.oneTimeAlert}`);
                    WazeWrap.Alerts.info(GM_info.script.name, `Layer: ${gisLayer.name}<br><br>Message:<br>${gisLayer.oneTimeAlert}`);
                    settings.oneTimeAlerts[layerId] = newAlertHash;
                    saveSettingsToStorage();
                }
            }
            if (idx === -1) settings.visibleLayers.push(layerId);
        } else if (idx > -1) settings.visibleLayers.splice(idx, 1);
        if (!ignoreFetch) {
            saveSettingsToStorage();
            fetchFeatures();
        }
    }

    function onOnlyShowApplicableLayersChanged() {
        settings.onlyShowApplicableLayers = $(this).is(':checked');
        saveSettingsToStorage();
        fetchFeatures();
    }

    function onStateCheckChanged(evt) {
        const state = evt.data;
        const idx = settings.selectedStates.indexOf(state);
        if (evt.target.checked) {
            if (idx === -1) settings.selectedStates.push(state);
        } else if (idx > -1) settings.selectedStates.splice(idx, 1);
        if (!ignoreFetch) {
            saveSettingsToStorage();
            initLayersTab();
            fetchFeatures();
        }
    }

    function onLayerCheckboxChanged(args) {
        setEnabled(args.checked);
    }

    function setFillParcels(doFill) {
        [LAYER_STYLES.parcels, LAYER_STYLES.state_parcels].forEach(style => {
            style.fillOpacity = doFill ? 0.2 : 0;
        });
    }

    function onFillParcelsCheckedChanged(evt) {
        const { checked } = evt.target;
        setFillParcels(checked);
        settings.fillParcels = checked;
        saveSettingsToStorage();
        fetchFeatures();
    }

    function onMapMove() {
        if (settings.enabled) fetchFeatures();
    }

    function onRefreshLayersClick() {
        const $btn = $('#gis-layers-refresh');
        if (!$btn.hasClass('fa-spin')) {
            $btn.css({ cursor: 'auto' });
            $btn.addClass('fa-spin');
            init(false);
        }
    }

    function onChevronClick(evt) {
        const $target = $(evt.currentTarget);
        $($target.children()[0])
            .toggleClass('fa fa-fw fa-chevron-down')
            .toggleClass('fa fa-fw fa-chevron-right');
        const $div = $($target.siblings()[0]);
        if ($div.css('display') === 'none') {
            $div.css('display', 'block');
        } else {
            $div.css('display', 'none');
        }
    }

    function doToggleABunch(evt, checkState) {
        ignoreFetch = true;
        $(evt.target).closest('fieldset').find('input').prop('checked', !checkState).trigger('click');
        ignoreFetch = false;
        saveSettingsToStorage();
        if (evt.data) initLayersTab();
        fetchFeatures();
    }

    function onSelectAllClick(evt) {
        doToggleABunch(evt, true);
    }

    function onSelectNoneClick(evt) {
        doToggleABunch(evt, false);
    }

    function onGisAddrDisplayChange(evt) {
        settings.addrLabelDisplay = evt.target.value;
        saveSettingsToStorage();
        fetchFeatures();
    }

    function onAddressDisplayShortcutKey() {
        if (!$('#gisAddrDisplay-hn').is(':checked')) {
            $('#gisAddrDisplay-hn').click();
        } else {
            $('#gisAddrDisplay-all').click();
        }
    }

    function onToggleGisLayersShortcutKey() {
        setEnabled(!settings.enabled);
    }

    function togglePopupVisibility() {
        const popup = document.getElementById('layerLabelPopup');
        if (popup) {
            popup.style.display = isPopupVisible ? 'block' : 'none';
        }
        saveSettingsToStorage();
    }

    function initLayer() {
        const rules = _gisLayers.map(gisLayer => new OpenLayers.Rule({
            filter: new OpenLayers.Filter.Comparison({
                type: OpenLayers.Filter.Comparison.EQUAL_TO,
                property: 'layerID',
                value: gisLayer.id
            }),
            symbolizer: gisLayer.style
        }));

        setFillParcels(settings.fillParcels);

        const style = new OpenLayers.Style(DEFAULT_STYLE, { rules });
        let existingLayer;
        let uniqueName;

        uniqueName = 'wmeGISLayersDefault';
        existingLayer = W.map.layers.find(l => l.uniqueName === uniqueName); // Note: W.map.getLayerByUniqueName(...) isn't working.
        if (existingLayer) W.map.removeLayer(existingLayer);
        mapLayer = new OpenLayers.Layer.Vector('PY GIS Layers - Default', {
            uniqueName,
            styleMap: new OpenLayers.StyleMap(style)
        });

        uniqueName = 'wmeGISLayersRoads';
        existingLayer = W.map.layers.find(l => l.uniqueName === uniqueName); // Note: W.map.getLayerByUniqueName(...) isn't wworking.
        if (existingLayer) W.map.removeLayer(existingLayer);
        roadLayer = new OpenLayers.Layer.Vector('PY GIS Layers - Roads', {
            uniqueName,
            styleMap: new OpenLayers.StyleMap(ROAD_STYLE)
        });

        mapLayer.setVisibility(settings.enabled);
        roadLayer.setVisibility(settings.enabled);

        W.map.addLayers([roadLayer, mapLayer]);
    } // END InitLayer

    function initLayersTab() {
        const user = userInfo.userName.toLowerCase();
        const states = _.uniq(_gisLayers.map(l => l.state)).filter(st => settings.selectedStates.includes(st));

        $('#panel-gis-state-layers').empty().append(
            $('<div>', { class: 'controls-container' }).css({ 'padding-top': '0px' }).append(
                $('<input>', { type: 'checkbox', id: 'only-show-applicable-gis-layers' }).change(
                    onOnlyShowApplicableLayersChanged
                ).prop('checked', settings.onlyShowApplicableLayers),
                $('<label>', { for: 'only-show-applicable-gis-layers' })
                    .css({ 'white-space': 'pre-line' }).text('Only show applicable layers')
            ),
            $('.gis-layers-state-checkbox:checked').length === 0
                ? $('<div>').text('Turn on layer categories in the Settings tab.')
                : states.map(st => $('<fieldset>', {
                    id: `gis-layers-for-${st}`,
                    style: 'border:1px solid silver;padding:4px;border-radius:4px;-webkit-padding-before: 0;'
                }).append(
                    $('<legend>', { style: 'margin-bottom:0px;border-bottom-style:none;width:auto;' })
                        .click(onChevronClick).append(
                            $('<i>', {
                                class: 'fa fa-fw fa-chevron-down',
                                style: 'cursor: pointer;font-size: 12px;margin-right: 4px'
                            }),
                            $('<span>', {
                                style: 'font-size:14px;font-weight:600;text-transform: uppercase; cursor: pointer'
                            }).text(STATES.toFullName(st))
                        ),
                    $('<div>', { id: `${st}_body` }).append(
                        $('<div>').css({ 'font-size': '11px' }).append(
                            $('<span>').append(
                                'Select ',
                                $('<a>', { href: '#' })
                                    .text('All')
                                    .click(onSelectAllClick),
                                ' / ',
                                $('<a>', { href: '#' })
                                    .text('None')
                                    .click(onSelectNoneClick)
                            )
                        ),
                        $('<div>', { class: 'controls-container', style: 'padding-top:0px;' }).append(
                            _gisLayers.filter(l => (l.state === st && (!PRIVATE_LAYERS.hasOwnProperty(l.id)
                              || PRIVATE_LAYERS[l.id].includes(user))))
                                .map(gisLayer => {
                                    const id = `gis-layer-${gisLayer.id}`;
                                    return $('<div>', { class: 'controls-container', id: `${id}-container` })
                                        .css({ 'padding-top': '0px', display: 'block' })
                                        .append(
                                            $('<input>', { type: 'checkbox', id })
                                                .data('layer-id', gisLayer.id)
                                                .change(onGisLayerToggleChanged)
                                                .prop('checked', settings.visibleLayers.includes(gisLayer.id)),
                                            $('<label>', { for: id, class: 'gis-state-layer-label' })
                                                .css({ 'white-space': 'pre-line' })
                                                .text(`${gisLayer.name}${gisLayer.restrictTo ? ' *' : ''}`)
                                                .attr('title', gisLayer.restrictTo ? `Restricted to: ${gisLayer.restrictTo}` : '')
                                                .contextmenu(evt => {
                                                    evt.preventDefault();
                                                    // TODO - enable the layer if it isn't already.
                                                    // Tried using click function on the evt target, but that didn't work.
                                                    _layerSettingsDialog.gisLayer = gisLayer;
                                                    _layerSettingsDialog.show();
                                                })
                                        );
                                })
                        )
                    )
                ))
        );
    }

    function initSettingsTab() {
        const states = _.uniq(_gisLayers.map(l => l.state));
        const createRadioBtn = (name, value, text, checked) => {
            const id = `${name}-${value}`;
            return [$('<input>', {
                type: 'radio', id, name, value
            }).prop('checked', checked), $('<label>', { for: id }).text(text).css({
                paddingLeft: '15px', marginRight: '4px'
            })];
        };
        $('#panel-gis-layers-settings').empty().append(
            $('<fieldset>', {
                style: 'border:1px solid silver;padding:8px;border-radius:4px;-webkit-padding-before: 0;margin-top:-8px;'
            }).append(
                $('<legend>', {
                    style: 'margin-bottom:0px;border-bottom-style:none;width:auto;'
                }).append($('<span>', {
                    style: 'font-size:14px;font-weight:600;text-transform: uppercase;'
                }).text('Labels')),
                $('<div>', { id: 'labelSettings' }).append(
                    $('<div>', { class: 'controls-container' }).css({ 'padding-top': '2px' }).append(
                        $('<label>', { style: 'font-weight:normal;' }).text('Addresses:'),
                        createRadioBtn('gisAddrDisplay', 'hn', 'HN', settings.addrLabelDisplay === 'hn'),
                        createRadioBtn('gisAddrDisplay', 'street', 'Street', settings.addrLabelDisplay === 'street'),
                        createRadioBtn('gisAddrDisplay', 'all', 'Both', settings.addrLabelDisplay === 'all'),
                        createRadioBtn('gisAddrDisplay', 'none', 'None', settings.addrLabelDisplay === 'none'),
                        $('<i>', {
                            class: 'waze-tooltip',
                            id: 'gisAddrDisplayInfo',
                            'data-toggle': 'tooltip',
                            style: 'margin-left:8px; font-size:12px',
                            'data-placement': 'bottom',
                            title: `This may not work properly for all layers. Please report issues to ${SCRIPT_AUTHOR}.`
                        }).tooltip(),
                        $('<br>'),
                        $('<label>', { style: 'font-weight:normal; margin-left:8px;' }).text('Label Popup:'),
                        createRadioBtn('popupVisibility', 'show', 'Show', isPopupVisible),
                        createRadioBtn('popupVisibility', 'hide', 'Hide', !isPopupVisible)
                    )
                )
            ),
            $('<fieldset>', {
                style: 'border:1px solid silver;padding:8px;border-radius:4px;-webkit-padding-before: 0;'
            }).append(
                $('<legend>', {
                    style: 'margin-bottom:0px;border-bottom-style:none;width:auto;'
                }).append($('<span>', {
                    style: 'font-size:14px;font-weight:600;text-transform: uppercase;'
                }).text('Layer Categories')),
                $('<div>', { id: 'states_body' }).append(
                    $('<div>').css({ 'font-size': '11px' }).append(
                        $('<span>').append(
                            'Select ',
                            $('<a>', { href: '#' }).text('All').click(true, onSelectAllClick),
                            ' / ',
                            $('<a>', { href: '#' }).text('None').click(true, onSelectNoneClick)
                        )
                    ),
                    $('<div>', { class: 'controls-container', style: 'padding-top:0px;' }).append(
                        states.map(st => {
                            const fullName = STATES.toFullName(st);
                            const id = `gis-layer-enable-state-${st}`;
                            return $('<div>', { class: 'controls-container' })
                                .css({ 'padding-top': '0px', display: 'block' })
                                .append(
                                    $('<input>', { type: 'checkbox', id, class: 'gis-layers-state-checkbox' })
                                        .change(st, onStateCheckChanged)
                                        .prop('checked', settings.selectedStates.includes(st)),
                                    $('<label>', { for: id }).css({ 'white-space': 'pre-line', color: '#777' }).text(fullName)
                                );
                        })
                    )
                )
            )
        );
        $('#panel-gis-layers-settings').append(
            $('<fieldset>', { style: 'border:1px solid silver;padding:8px;border-radius:4px;-webkit-padding-before: 0;' })
                .append(
                    $('<legend>', { style: 'margin-bottom:0px;border-bottom-style:none;width:auto;' })
                        .append(
                            $('<span>', { style: 'font-size:14px;font-weight:600;text-transform: uppercase;' })
                                .text('Appearance')
                        ),
                    $('<div>', { class: 'controls-container' }).css({ 'padding-top': '2px' }).append(
                        $('<input>', { type: 'checkbox', id: 'fill-parcels' })
                            .change(onFillParcelsCheckedChanged)
                            .prop('checked', settings.fillParcels),
                        $('<label>', { for: 'fill-parcels' }).css({ 'white-space': 'pre-line', color: '#777' }).text('Fill parcels')
                    )
                )
        );
        $('input[name="gisAddrDisplay"]').change(onGisAddrDisplayChange);
        $('input[name="popupVisibility"]').change(function() {
            isPopupVisible = $(this).val() === 'show';
            togglePopupVisibility();
        });
    }

    async function initTab(firstCall = true) {
        if (firstCall) {
            const content = $('<div>').append(
                $('<span>', { style: 'font-size:14px;font-weight:600' }).text('PY GIS Layers'),
                $('<span>', { style: 'font-size:11px;margin-left:10px;color:#aaa;' }).text(GM_info.script.version),
                // <a href="https://docs.google.com/forms/d/e/1FAIpQLSfMhBxF0P6bn8dFfOoNTAF1LHBFXr5w9oXvzqsii_TfA-_Bmw/viewform?usp=pp_url&entry.831784226=test" target="_blank" style="color: #6290b7;font-size: 12px;margin-left: 8px;" title="Report broken layers, bugs, request new layers, script features">Report an issue</a>
                $('<a>', {
                    href: REQUEST_FORM_URL.replace('{username}', userInfo.userName),
                    target: '_blank',
                    style: 'color: #6290b7;font-size: 12px;margin-left: 8px;',
                    title: 'Report broken layers, bugs, request new layers, script features'
                }).text('Submit a request'),
                $('<span>', {
                    id: 'gis-layers-refresh',
                    class: 'fa fa-refresh',
                    style: 'float: right;',
                    'data-toggle': 'tooltip',
                    title: 'Pull new layer info from master sheet and refresh all layers.'
                }),
                '<ul class="nav nav-tabs">'
              + '<li class="active"><a data-toggle="tab" href="#panel-gis-state-layers" aria-expanded="true">'
              + 'Layers'
              + '</a></li>'
              + '<li><a data-toggle="tab" href="#panel-gis-layers-settings" aria-expanded="true">'
              + 'Settings'
              + '</a></li> '
              + '</ul>',
                $('<div>', { class: 'tab-content', style: 'padding:8px;padding-top:2px' }).append(
                    $('<div>', { class: 'tab-pane active', id: 'panel-gis-state-layers', style: 'padding: 4px 0px 0px 0px; width: auto' }),
                    $('<div>', { class: 'tab-pane', id: 'panel-gis-layers-settings', style: 'padding: 4px 0px 0px 0px; width: auto' })
                )
            ).html();

            const powerButtonColor = settings.enabled ? '#00bd00' : '#ccc';
            const labelText = $('<div>').append(
                $('<span>', {
                    class: 'fa fa-power-off',
                    id: 'gis-layers-power-btn',
                    style: `margin-right: 5px;cursor: pointer;color: ${powerButtonColor};font-size: 13px;`,
                    title: 'Toggle PY GIS Layers'
                }),
                $('<span>', { title: 'PY GIS Layers' }).text('PY GIS-L')
            ).html();

            const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
            tabLabel.innerHTML = labelText;
            tabPane.innerHTML = content;
            // Fix tab content div spacing.
            $(tabPane).parent().css({ width: 'auto', padding: '6px' });
            $('#gis-layers-power-btn').click(() => {
                setEnabled(!settings.enabled);

                // return false to prevent event from bubbling up the DOM tree and causing the GIS-L tab to activate
                return false;
            });
            $('#gis-layers-refresh').click(onRefreshLayersClick);
        }

        initSettingsTab();
        initLayersTab();
    }

    function initGui(firstCall = true) {
        initLayer();

        if (firstCall) {
            initTab(true);

            sdk.LayerSwitcher.addLayerCheckbox({ name: 'PY GIS Layers' });
            sdk.LayerSwitcher.setLayerCheckboxChecked({ name: 'PY GIS Layers', isChecked: settings.enabled });
            sdk.Events.on({ eventName: 'wme-layer-checkbox-toggled', eventHandler: onLayerCheckboxChanged });
            sdk.Events.on({ eventName: 'wme-map-move-end', eventHandler: onMapMove });
            showScriptInfoAlert();
        } else {
            initTab(firstCall);
        }
    }

    async function loadSpreadsheetAsync() {
        let data;
        try {
            data = await $.getJSON(`${LAYER_DEF_SPREADSHEET_URL}?${DEC(API_KEY)}`);
        } catch (err) {
            throw new Error(`Spreadsheet call failed. (${err.status}: ${err.statusText})`);
        }
        const [[minVersion], fieldNames, ...layerDefRows] = data.values;
        const REQUIRED_FIELD_NAMES = [
            'state', 'name', 'id', 'counties', 'url', 'where', 'labelFields',
            'processLabel', 'style', 'visibleAtZoom', 'labelsVisibleAtZoom', 'enabled',
            'restrictTo', 'oneTimeAlert', "areaToPoint", "isFeatureSet", "serverType"
        ];
        const result = { error: null };
        const checkFieldNames = fldName => fieldNames.includes(fldName);

        if (scriptVersion < minVersion) {
            result.error = `Script must be updated to at least version ${
                minVersion} before layer definitions can be loaded.`;
        } else if (fieldNames.length < REQUIRED_FIELD_NAMES.length) {
            result.error = `Expected ${
                REQUIRED_FIELD_NAMES.length} columns in layer definition data.  Spreadsheet returned ${
                fieldNames.length}.`;
        } else if (!REQUIRED_FIELD_NAMES.every(fldName => checkFieldNames(fldName))) {
            result.error = 'Script expected to see the following column names in the layer '
              + `definition spreadsheet:\n${REQUIRED_FIELD_NAMES.join(', ')}\n`
              + `But the spreadsheet returned these:\n${fieldNames.join(', ')}`;
        }
        if (!result.error) {
            layerDefRows.filter(row => row.length).forEach(layerDefRow => {
                const layerDef = { enabled: '0' };
                fieldNames.forEach((fldName, fldIdx) => {
                    let value = layerDefRow[fldIdx];
                    if (value !== undefined && value.trim().length > 0) {
                        value = value.trim();
                        if (fldName === 'counties' || fldName === 'labelFields') {
                            value = value.split(',').map(item => item.trim());
                        } else if (fldName === 'processLabel') {
                            try {
                                value = ESTreeProcessor.compile(`function __$proc(){${value}} __$proc();`);
                            } catch (ex) {
                                layerDef.labelProcessingError = true;
                                logError(`Error loading label processing function for layer "${layerDef.id}".`);
                                logDebug(ex);
                            }
                        } else if (fldName === 'style') {
                            layerDef.isRoadLayer = value === 'roads';
                            if (LAYER_STYLES.hasOwnProperty(value)) {
                                value = LAYER_STYLES[value];
                            } else if (!layerDef.isRoadLayer) {
                                // If style is not defined, try to read in as JSON (custom style)
                                try {
                                    value = JSON.parse(value);
                                } catch (ex) {
                                    // ignore error
                                }
                            }
                        } else if (fldName === 'state') {
                            value = value ? value.toUpperCase() : value;
                        } else if (fldName === 'restrictTo') {
                            try {
                                const values = value.split(',').map(v => v.trim().toLowerCase());
                                layerDef.notAllowed = !values.some(entry => {
                                    const rankMatch = entry.match(/^r(\d)(\+am)?$/);
                                    if (rankMatch) {
                                        if (rankMatch[1] <= (userInfo.rank + 1) && (!rankMatch[2] || userInfo.isAreaManager)) {
                                            return true;
                                        }
                                    } else if (entry === 'am' && userInfo.isAreaManager) {
                                        return true;
                                    } else if (entry === userInfo.userName.toLowerCase()) {
                                        return true;
                                    }
                                    return false;
                                });
                            } catch (ex) {
                                logError(ex);
                            }
                        }
                        layerDef[fldName] = value;
                    } else if (fldName === 'labelFields') {
                        layerDef[fldName] = [''];
                    }
                });
                const enabled = layerDef.enabled && !['0', 'false', 'no', 'n'].includes(layerDef.enabled.toString().trim().toLowerCase());
                if (!layerDef.notAllowed && enabled) {
                    _gisLayers.push(layerDef);
                }
            });
        }

        return result;
    }

    function createShortcut(shortcutId, description, callback) {
        let shortcutKeys = settings.shortcuts?.[shortcutId] ?? null;
        if (shortcutKeys && sdk.Shortcuts.areShortcutKeysInUse({ shortcutKeys })) {
            shortcutKeys = null;
        }
        sdk.Shortcuts.createShortcut({
            shortcutId,
            shortcutKeys,
            description,
            callback
        });
    }

    async function init(firstCall = true) {
        _gisLayers = [];
        if (firstCall) {
            userInfo = sdk.State.getUserInfo();
            labelProcessingGlobalVariables.W = W;
            labelProcessingGlobalVariables.sdk = sdk;
            initRoadStyle();
            loadSettingsFromStorage();
            createShortcut('toggleHnsOnly', 'Toggle HN-only address labels (GIS Layers)', onAddressDisplayShortcutKey);
            createShortcut('toggleEnabled', 'Toggle display of GIS Layers', onToggleGisLayersShortcutKey);
            installPathFollowingLabels();
            window.addEventListener('beforeunload', saveSettingsToStorage, false);
            _layerSettingsDialog = new LayerSettingsDialog();
        }
        const t0 = performance.now();
        try {
            const result = await loadSpreadsheetAsync();
            if (result.error) {
                logError(result.error);
                return;
            }
            _layerRefinements.forEach(layerRefinement => {
                const layerDef = _gisLayers.find(layerDef2 => layerDef2.id === layerRefinement.id);
                if (layerDef) {
                    Object.keys(layerRefinement).forEach(fldName => {
                        const value = layerRefinement[fldName];
                        if (fldName !== 'id' && layerDef.hasOwnProperty(fldName)) {
                            logDebug(`The "${fldName}" property of layer "${
                                layerDef.id}" has a value hardcoded in the script, and also defined in the spreadsheet.`
                              + ' The spreadsheet value takes precedence.');
                        } else if (value) layerDef[fldName] = value;
                    });
                } else {
                    logDebug(`Refined layer "${layerRefinement.id}" does not have a corresponding layer defined`
                      + ' in the spreadsheet.  It can probably be removed from the script.');
                }
            });
            logDebug(`Loaded ${_gisLayers.length} layer definitions in ${Math.round(performance.now() - t0)} ms.`);
            initGui(firstCall);
            fetchFeatures();
            $('#gis-layers-refresh').removeClass('fa-spin').css({ cursor: 'pointer' });
            logDebug('Initialized.');
        } catch (err) {
            logError(err);
        }
    }

    init();

    /*eslint-disable*/
  function installPathFollowingLabels() {
      // Copyright (c) 2015 by Jean-Marc.Viglino [at]ign.fr
      // Dual-licensed under the CeCILL-B Licence (http://www.cecill.info/)
      // and the Beerware license (http://en.wikipedia.org/wiki/Beerware),
      // feel free to use and abuse it in your projects (the code, not the beer ;-).
      //
      //* Overwrite the SVG function to allow text along a path
      //*	setStyle function
      //*
      //*	Add new options to the Openlayers.Style

      // pathLabel: {String} Label to draw on the path
      // pathLabelXOffset: {String} Offset along the line to start drawing text in pixel or %, default: "50%"
      // pathLabelYOffset: {Number} Distance of the line to draw the text
      // pathLabelCurve: {String} Smooth the line the label is drawn on (empty string for no)
      // pathLabelReadable: {String} Make the label readable (empty string for no)

      // *	Extra standard values : all label and text values


      //  *
      //  * Method: removeChildById
      //  * Remove child in a node.
      //  *

      function removeChildById(node, id) {
          if (node.querySelector) {
              var c = node.querySelector('#' + id);
              if (c) node.removeChild(c);
              return;
          }
          // For old browsers
          var c = node.childNodes;
          if (c) for (var i = 0; i < c.length; i++) {
              if (c[i].id === id) {
                  node.removeChild(c[i]);
                  return;
              }
          }
      }


      //  *
      //  * Method: setStyle
      //  * Use to set all the style attributes to a SVG node.
      //  *
      //  * Takes care to adjust stroke width and point radius to be
      //  * resolution-relative
      //  *
      //  * Parameters:
      //  * node - {SVGDomElement} An SVG element to decorate
      //  * style - {Object}
      //  * options - {Object} Currently supported options include
      //  *                              'isFilled' {Boolean} and
      //  *                              'isStroked' {Boolean}

      var setStyle = OpenLayers.Renderer.SVG.prototype.setStyle;
      OpenLayers.Renderer.SVG.LABEL_STARTOFFSET = { 'l': '0%', 'r': '100%', 'm': '50%' };

      OpenLayers.Renderer.SVG.prototype.pathText = function (node, style, suffix) {
          var label = this.nodeFactory(null, 'text');
          label.setAttribute('id', node._featureId + '_' + suffix);
          if (style.fontColor) label.setAttributeNS(null, 'fill', style.fontColor);
          if (style.fontStrokeColor) label.setAttributeNS(null, 'stroke', style.fontStrokeColor);
          if (style.fontStrokeWidth) label.setAttributeNS(null, 'stroke-width', style.fontStrokeWidth);
          if (style.fontOpacity) label.setAttributeNS(null, 'opacity', style.fontOpacity);
          if (style.fontFamily) label.setAttributeNS(null, 'font-family', style.fontFamily);
          if (style.fontSize) label.setAttributeNS(null, 'font-size', style.fontSize);
          if (style.fontWeight) label.setAttributeNS(null, 'font-weight', style.fontWeight);
          if (style.fontStyle) label.setAttributeNS(null, 'font-style', style.fontStyle);
          if (style.labelSelect === true) {
              label.setAttributeNS(null, 'pointer-events', 'visible');
              label._featureId = node._featureId;
          } else {
              label.setAttributeNS(null, 'pointer-events', 'none');
          }

          function getpath(pathStr, readeable) {
              var npath = pathStr.split(',');
              var pts = [];
              if (!readeable || Number(npath[0]) - Number(npath[npath.length - 2]) < 0) {
                  while (npath.length) pts.push({ x: Number(npath.shift()), y: Number(npath.shift()) });
              } else {
                  while (npath.length) pts.unshift({ x: Number(npath.shift()), y: Number(npath.shift()) });
              }
              return pts;
          }

          var path = this.nodeFactory(null, 'path');
          var tpid = node._featureId + '_t' + suffix;
          var tpath = node.getAttribute('points');
          if (style.pathLabelCurve) {
              var pts = getpath(tpath, style.pathLabelReadable);
              var p = pts[0].x + ' ' + pts[0].y;
              var dx, dy, s1, s2;
              dx = (pts[0].x - pts[1].x) / 4;
              dy = (pts[0].y - pts[1].y) / 4;
              for (var i = 1; i < pts.length - 1; i++) {
                  p += ' C ' + (pts[i - 1].x - dx) + ' ' + (pts[i - 1].y - dy);
                  dx = (pts[i - 1].x - pts[i + 1].x) / 4;
                  dy = (pts[i - 1].y - pts[i + 1].y) / 4;
                  s1 = Math.sqrt(Math.pow(pts[i - 1].x - pts[i].x, 2) + Math.pow(pts[i - 1].y - pts[i].y, 2));
                  s2 = Math.sqrt(Math.pow(pts[i + 1].x - pts[i].x, 2) + Math.pow(pts[i + 1].y - pts[i].y, 2));
                  p += ' ' + (pts[i].x + s1 * dx / s2) + ' ' + (pts[i].y + s1 * dy / s2);
                  dx *= s2 / s1;
                  dy *= s2 / s1;
                  p += ' ' + pts[i].x + ' ' + pts[i].y;
              }
              p += ' C ' + (pts[i - 1].x - dx) + ' ' + (pts[i - 1].y - dy);
              dx = (pts[i - 1].x - pts[i].x) / 4;
              dy = (pts[i - 1].y - pts[i].y) / 4;
              p += ' ' + (pts[i].x + dx) + ' ' + (pts[i].y + dy);
              p += ' ' + pts[i].x + ' ' + pts[i].y;

              path.setAttribute('d', 'M ' + p);
          } else {
              if (style.pathLabelReadable) {
                  var pts = getpath(tpath, style.pathLabelReadable);
                  var p = '';
                  for (var i = 0; i < pts.length; i++) p += ' ' + pts[i].x + ' ' + pts[i].y;
                  path.setAttribute('d', 'M ' + p);
              } else path.setAttribute('d', 'M ' + tpath);
          }
          path.setAttribute('id', tpid);

          var defs = this.createDefs();
          removeChildById(defs, tpid);
          defs.appendChild(path);

          var textPath = this.nodeFactory(null, 'textPath');
          textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + tpid);
          var align = style.labelAlign || OpenLayers.Renderer.defaultSymbolizer.labelAlign;
          label.setAttributeNS(null, 'text-anchor', OpenLayers.Renderer.SVG.LABEL_ALIGN[align[0]] || 'middle');
          textPath.setAttribute('startOffset', style.pathLabelXOffset || OpenLayers.Renderer.SVG.LABEL_STARTOFFSET[align[0]] || '50%');
          label.setAttributeNS(null, 'dominant-baseline', OpenLayers.Renderer.SVG.LABEL_ALIGN[align[1]] || 'central');
          if (style.pathLabelYOffset) label.setAttribute('dy', style.pathLabelYOffset);
          //textPath.setAttribute('method','stretch');
          //textPath.setAttribute('spacing','auto');

          textPath.textContent = style.pathLabel;
          label.appendChild(textPath);

          removeChildById(this.textRoot, node._featureId + '_' + suffix);
          this.textRoot.appendChild(label);
      };

      OpenLayers.Renderer.SVG.prototype.setStyle = function (node, style, options) {
          if (node._geometryClass === 'OpenLayers.Geometry.LineString' && style.pathLabel) {
              if (node._geometryClass === 'OpenLayers.Geometry.LineString' && style.pathLabel) {
                  var drawOutline = (!!style.labelOutlineWidth);
                  // First draw text in halo color and size and overlay the
                  // normal text afterwards
                  if (drawOutline) {
                      var outlineStyle = OpenLayers.Util.extend({}, style);
                      outlineStyle.fontColor = outlineStyle.labelOutlineColor;
                      outlineStyle.fontStrokeColor = outlineStyle.labelOutlineColor;
                      outlineStyle.fontStrokeWidth = style.labelOutlineWidth;
                      if (style.labelOutlineOpacity) outlineStyle.fontOpacity = style.labelOutlineOpacity;
                      delete outlineStyle.labelOutlineWidth;
                      this.pathText(node, outlineStyle, 'txtpath0');
                  }
                  this.pathText(node, style, 'txtpath');
                  setStyle.apply(this, arguments);
              }
          } else setStyle.apply(this, arguments);
          return node;
      };

      //  *
      //  * Method: drawGeometry
      //  * Remove the textpath if no geometry is drawn.
      //  *
      //  * Parameters:
      //  * geometry - {<OpenLayers.Geometry>}
      //  * style - {Object}
      //  * featureId - {String}
      //  *
      //  * Returns:
      //  * {Boolean} true if the geometry has been drawn completely; null if
      //  *     incomplete; false otherwise

      var drawGeometry = OpenLayers.Renderer.SVG.prototype.drawGeometry;
      OpenLayers.Renderer.SVG.prototype.drawGeometry = function (geometry, style, id) {
          var rendered = drawGeometry.apply(this, arguments);
          if (rendered === false) {
              removeChildById(this.textRoot, id + '_txtpath');
              removeChildById(this.textRoot, id + '_txtpath0');
          }
          return rendered;
      };

      // *
      // * Method: eraseGeometry
      // * Erase a geometry from the renderer. In the case of a multi-geometry,
      // *     we cycle through and recurse on ourselves. Otherwise, we look for a
      // *     node with the geometry.id, destroy its geometry, and remove it from
      // *     the DOM.
      // *
      // * Parameters:
      // * geometry - {<OpenLayers.Geometry>}
      // * featureId - {String}

      var eraseGeometry = OpenLayers.Renderer.SVG.prototype.eraseGeometry;
      OpenLayers.Renderer.SVG.prototype.eraseGeometry = function (geometry, featureId) {
          eraseGeometry.apply(this, arguments);
          removeChildById(this.textRoot, featureId + '_txtpath');
          removeChildById(this.textRoot, featureId + '_txtpath0');
      };

  }
})();
