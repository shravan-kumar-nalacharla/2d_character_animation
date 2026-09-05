/* Algowzxd read-only After Effects / Duik exporter. ExtendScript ES3. */
(function () {
    var SCHEMA = "algowzxd.duik-ae-export";
    var VERSION = "1.0.0";

    function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
    function isoDate() { return new Date().toISOString ? new Date().toISOString() : String(new Date()); }
    function arrayValue(value) {
        if (value instanceof Array) { var out = []; for (var i = 0; i < value.length; i++) out.push(arrayValue(value[i])); return out; }
        if (value !== null && typeof value === "object") return String(value);
        return value;
    }
    function quote(value) {
        return '"' + String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"';
    }
    function json(value) {
        if (value === null) return "null";
        if (typeof value === "string") return quote(value);
        if (typeof value === "number") return isFinite(value) ? String(value) : "null";
        if (typeof value === "boolean") return value ? "true" : "false";
        if (value instanceof Array) { var a = []; for (var i = 0; i < value.length; i++) a.push(json(value[i])); return "[" + a.join(",") + "]"; }
        if (typeof value === "object") { var pairs = []; for (var key in value) if (value.hasOwnProperty(key) && value[key] !== undefined) pairs.push(quote(key) + ":" + json(value[key])); return "{" + pairs.join(",") + "}"; }
        return "null";
    }
    function interpolationName(value) { return safe(function () { return String(value); }, "unknown"); }
    function temporalEase(eases) {
        var out = [];
        if (!eases) return out;
        for (var i = 0; i < eases.length; i++) out.push({ speed: eases[i].speed, influence: eases[i].influence });
        return out;
    }
    function keyframes(prop) {
        var out = [];
        var count = safe(function () { return prop.numKeys; }, 0);
        for (var i = 1; i <= count; i++) {
            out.push({
                time: safe(function () { return prop.keyTime(i); }, 0),
                value: arrayValue(safe(function () { return prop.keyValue(i); }, null)),
                inInterpolation: interpolationName(safe(function () { return prop.keyInInterpolationType(i); }, "unknown")),
                outInterpolation: interpolationName(safe(function () { return prop.keyOutInterpolationType(i); }, "unknown")),
                inTemporalEase: temporalEase(safe(function () { return prop.keyInTemporalEase(i); }, [])),
                outTemporalEase: temporalEase(safe(function () { return prop.keyOutTemporalEase(i); }, [])),
                temporalContinuous: safe(function () { return prop.keyTemporalContinuous(i); }, false),
                temporalAutoBezier: safe(function () { return prop.keyTemporalAutoBezier(i); }, false),
                spatialContinuous: safe(function () { return prop.keySpatialContinuous(i); }, false),
                spatialAutoBezier: safe(function () { return prop.keySpatialAutoBezier(i); }, false)
            });
        }
        return out;
    }
    function exportProperty(prop, path, time) {
        var name = safe(function () { return prop.name; }, "Property");
        var itemPath = path ? path + "/" + name : name;
        var result = { name: name, matchName: safe(function () { return prop.matchName; }, ""), path: itemPath };
        var propertyType = safe(function () { return prop.propertyType; }, null);
        if (propertyType === PropertyType.PROPERTY) {
            result.value = arrayValue(safe(function () { return prop.value; }, null));
            result.evaluatedValue = arrayValue(safe(function () { return prop.valueAtTime(time, false); }, result.value));
            result.expression = safe(function () { return prop.canSetExpression && prop.expression ? prop.expression : undefined; }, undefined);
            result.expressionEnabled = safe(function () { return prop.expressionEnabled; }, false);
            result.keyframes = keyframes(prop);
        } else {
            result.children = [];
            var count = safe(function () { return prop.numProperties; }, 0);
            for (var i = 1; i <= count; i++) result.children.push(exportProperty(prop.property(i), itemPath, time));
        }
        return result;
    }
    function value(group, matchName, fallback, time) {
        return arrayValue(safe(function () {
            var prop = group.property(matchName);
            return prop.valueAtTime(time, false);
        }, fallback));
    }
    function transform(layer, time, evaluated) {
        var group = layer.property("ADBE Transform Group");
        function read(matchName, fallback) {
            return arrayValue(safe(function () { var prop = group.property(matchName); return evaluated ? prop.valueAtTime(time, false) : prop.value; }, fallback));
        }
        return {
            anchorPoint: read("ADBE Anchor Point", [0, 0]), position: read("ADBE Position", [0, 0]), scale: read("ADBE Scale", [100, 100]),
            rotation: read("ADBE Rotate Z", 0), opacity: read("ADBE Opacity", 100)
        };
    }
    function classify(layer, effects, expressions) {
        var metadata = (layer.name + " " + safe(function () { return layer.comment; }, "") + " " + json(effects)).toLowerCase();
        var joined = (metadata + " " + json(expressions)).toLowerCase();
        var tags = [];
        if (/duik.*controller|controller.?type|\/\*== duik: controller|\bctrl\b|\bcontrol\b/.test(metadata)) tags.push("controller");
        if (/\bbone\b|structure/.test(metadata)) tags.push("bone");
        if (/puppet pin/.test(joined)) tags.push("puppet-pin");
        if (/2dslider|slider control|c < slider >/.test(joined)) tags.push("slider");
        if (/\bik\b|two.?layer|two.?bone/.test(joined)) tags.push("ik-candidate");
        if (/mouth|eye|eyebrow|hand|leg|head|hoodie/.test(joined)) tags.push("character-artwork");
        return tags;
    }
    function collectExpressions(group, path, time, out) {
        if (!group) return;
        var count = safe(function () { return group.numProperties; }, 0);
        for (var i = 1; i <= count; i++) {
            var prop = group.property(i);
            var nextPath = path + "/" + safe(function () { return prop.name; }, "Property");
            if (safe(function () { return prop.propertyType === PropertyType.PROPERTY; }, false)) {
                if (safe(function () { return prop.canSetExpression && prop.expression !== ""; }, false)) out.push(exportProperty(prop, path, time));
            } else collectExpressions(prop, nextPath, time, out);
        }
    }
    function layerKind(layer) {
        if (layer instanceof CameraLayer) return "camera";
        if (layer instanceof LightLayer) return "light";
        if (layer instanceof ShapeLayer) return "shape";
        if (layer instanceof TextLayer) return "text";
        if (layer instanceof AVLayer) return "av";
        return "layer";
    }
    function exportLayer(layer, time) {
        var effectsGroup = safe(function () { return layer.property("ADBE Effect Parade"); }, null);
        var effects = effectsGroup ? exportProperty(effectsGroup, "", time).children || [] : [];
        var expressions = [];
        collectExpressions(layer, "Layer", time, expressions);
        var allProperties = [];
        var groups = ["ADBE Transform Group", "ADBE Effect Parade", "ADBE Mask Parade", "ADBE Root Vectors Group", "ADBE Puppet"];
        for (var g = 0; g < groups.length; g++) {
            var prop = safe(function () { return layer.property(groups[g]); }, null);
            if (prop) allProperties.push(exportProperty(prop, "Layer", time));
        }
        return {
            id: safe(function () { return layer.id; }, layer.index), index: layer.index, name: layer.name,
            comment: safe(function () { return layer.comment; }, ""), kind: layerKind(layer),
            parentLayerId: layer.parent ? safe(function () { return layer.parent.id; }, layer.parent.index) : null,
            source: safe(function () { return layer.source ? { id: layer.source.id, name: layer.source.name, type: layer.source instanceof CompItem ? "comp" : "footage" } : null; }, null),
            enabled: safe(function () { return layer.enabled; }, true), shy: safe(function () { return layer.shy; }, false), locked: safe(function () { return layer.locked; }, false),
            threeDLayer: safe(function () { return layer.threeDLayer; }, false), adjustmentLayer: safe(function () { return layer.adjustmentLayer; }, false),
            blendMode: safe(function () { return String(layer.blendingMode); }, ""), inPoint: layer.inPoint, outPoint: layer.outPoint, startTime: layer.startTime, stretch: layer.stretch,
            transform: { raw: transform(layer, time, false), evaluated: transform(layer, time, true) },
            effects: effects, expressions: expressions, properties: allProperties,
            classification: classify(layer, effects, expressions)
        };
    }
    function exportComp(comp) {
        var restTime = Math.max(comp.displayStartTime, comp.workAreaStart);
        var layers = [];
        for (var i = 1; i <= comp.numLayers; i++) layers.push(exportLayer(comp.layer(i), restTime));
        return { id: comp.id, name: comp.name, width: comp.width, height: comp.height, pixelAspect: comp.pixelAspect, fps: comp.frameRate, duration: comp.duration, displayStart: comp.displayStartTime, workArea: { start: comp.workAreaStart, duration: comp.workAreaDuration }, layers: layers };
    }
    function main() {
        if (!app.project) { alert("Open the Algowzxd After Effects project first."); return; }
        var active = app.project.activeItem instanceof CompItem ? app.project.activeItem : null;
        var selected = app.project.selection;
        var root = active;
        for (var s = 0; !root && s < selected.length; s++) if (selected[s] instanceof CompItem) root = selected[s];
        var comps = [];
        for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem) comps.push(exportComp(app.project.item(i)));
        if (!comps.length) { alert("No compositions were found."); return; }
        var output = {
            schema: SCHEMA, schemaVersion: 1, exporterVersion: VERSION, exportedAt: isoDate(),
            project: { name: safe(function () { return app.project.file ? app.project.file.name : "Untitled"; }, "Untitled"), path: safe(function () { return app.project.file ? app.project.file.fsName : ""; }, ""), rootCompId: root ? root.id : null },
            app: { name: app.name, version: app.version }, comps: comps,
            warnings: root ? [] : ["No active/selected root composition; importer will choose the composition with the most layers."]
        };
        var file = File.saveDialog("Save Algowzxd Duik export", "JSON:*.json");
        if (!file) return;
        file.encoding = "UTF-8";
        file.open("w"); file.write(json(output)); file.close();
        alert("Duik rig export complete:\n" + file.fsName + "\n\nThe AEP was not modified.");
    }
    main();
})();
