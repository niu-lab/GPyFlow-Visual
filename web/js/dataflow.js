var GOJS = go.GraphObject.make;

function init() {
    // 设置右键菜单
    // setRightClickMemu();
    // 加载GOJS
    myDiagram =
        GOJS(go.Diagram, "myDiagramDiv",
            {
                initialContentAlignment: go.Spot.TopLeft,
                initialAutoScale: go.Diagram.UniformToFill,
                layout: GOJS(go.LayeredDigraphLayout,
                    {direction: 90}),
                "undoManager.isEnabled": true,
                "allowCopy": false
            }
        );

    myDiagram.addDiagramListener("SelectionDeleted", function (e) {
        e.subject.each(function (p) {
            var stepName = p.part.data.key;
            if (stepName === undefined) {
                return
            }
            var config = p.part.data.config;
            removeMacros(config.commandLine);
            console.log("remove" + ":" + stepName);
            myDiagram.nodeTemplateMap.remove(stepName);

        })
    });

    // 设置右键菜单
    myDiagram.contextMenu =
        GOJS(go.Adornment, "Vertical",
            GOJS("ContextMenuButton",
                GOJS(go.TextBlock, "New Step"),
                {
                    click: function (e, obj) {
                        clearEdit();
                        $("#title").text("New Step");
                        $("#edit").modal("show");
                    }
                }),
            GOJS("ContextMenuButton",
                GOJS(go.TextBlock, "Macros"),
                {
                    click: function (e, obj) {
                        var macroTemplate = $.templates("#macroTmpl");
                        var data = {
                            "macros": macros,
                        };
                        var output = macroTemplate.render(data);
                        $('#macros-group').html(output);
                        $("#macros-list").modal("show");
                    }
                }),
            GOJS("ContextMenuButton",
                GOJS(go.TextBlock, "Layout"),
                {
                    click: function (e, obj) {
                        layout();
                    }
                }),
            GOJS("ContextMenuButton",
                GOJS(go.TextBlock, "Clear"),
                {
                    click: function (e, obj) {
                        window.location.reload();
                    }
                }),
        );

    myDiagram.linkTemplate =
        GOJS(go.Link,
            {
                routing: go.Link.Orthogonal, corner: 5,
                relinkableFrom: true, relinkableTo: true
            },
            GOJS(go.Shape, {stroke: "gray", strokeWidth: 2}),
            GOJS(go.Shape, {stroke: "gray", fill: "gray", toArrow: "Standard"})
        );

    var modelJson = {
        "class": "go.GraphLinksModel",
        "nodeCategoryProperty": "type",
        "linkFromPortIdProperty": "frompid",
        "linkToPortIdProperty": "topid",
    };
    myDiagram.model = go.Model.fromJson(modelJson);
}

function layout() {
    var direction = myDiagram.layout.direction;
    console.log("before:" + direction);
    if (direction == 0) {
        myDiagram.layout = GOJS(go.LayeredDigraphLayout,
            {direction: 90});
    }
    if (direction == 90) {
        myDiagram.layout = GOJS(go.LayeredDigraphLayout,
            {direction: 0});
    }
    myDiagram.layoutDiagram(true);
}


function makePort(name, leftside) {
    var portColor = "red";

    if (leftside) {
        portColor = "green"
    }

    // port name
    var port = GOJS(go.Shape,
        "Rectangle",
        {
            fill: portColor, stroke: null,
            desiredSize: new go.Size(8, 8),
            portId: name,  // declare this object to be a "port"
            toMaxLinks: 1,  // don't allow more than one link into a port
            cursor: "pointer"  // show a different cursor to indicate potential link point
        });


    // port label
    var lab = GOJS(go.TextBlock,
        name,  // the name of the port
        {
            font: "8pt sans-serif",
        });

    // panel
    var panel = GOJS(go.Panel,
        "Horizontal"
    );

    // set up the port/panel based on which side of the node it will be on
    if (leftside) {
        port.toSpot = go.Spot.Left;
        port.toLinkable = true;
        // panel.alignment = go.Spot.TopLeft;
        panel.add(lab);
        panel.add(port);

    } else {
        port.fromSpot = go.Spot.Right;
        port.fromLinkable = true;
        // panel.alignment = go.Spot.TopRight;
        panel.add(port);
        panel.add(lab);
    }
    return panel;
}

function makeTemplate(typename, inports, outports) {
    var node = GOJS(go.Node,
        "Spot",
        GOJS(go.Panel, "Spot",
            GOJS(go.Shape,
                "RoundedRectangle",
                {
                    fill: "#99ffcc",
                    stroke: null,
                    strokeWidth: 0,
                    alignment: new go.Spot(0.5, 0.5),
                    // spot1: go.Spot.TopLeft,
                    // spot2: go.Spot.BottomRight
                }),

            GOJS(go.TextBlock,
                new go.Binding("text", "name").makeTwoWay(),
                {
                    alignment: new go.Spot(0.5, 0.5),
                    stroke: "black",
                    font: "bold 10pt sans-serif",
                    fromLinkable: true,
                    fromLinkableSelfNode: false,
                    fromLinkableDuplicates: true,
                    toLinkable: true,
                    toLinkableSelfNode: false,
                    toLinkableDuplicates: true,
                    portId: typename,
                    cursor: "pointer",
                }
            ),
        ),
        GOJS(go.Panel, "Vertical",
            {
                // alignment: new go.Spot(0, 0.5),
                // alignmentFocus: new go.Spot(0, 0.5, -8, 0)
                alignment: go.Spot.LeftCenter,
                alignmentFocus: go.Spot.RightCenter
            },
            inports),
        GOJS(go.Panel, "Vertical",
            {
                // alignment: new go.Spot(1, 0.5),
                // alignmentFocus: new go.Spot(1, 0.5, 8, 0)
                alignment: go.Spot.RightCenter,
                alignmentFocus: go.Spot.LeftCenter,

            },
            outports),
        {
            contextMenu:     // define a context menu for each node
                GOJS(go.Adornment, "Vertical",  // that has one button
                    GOJS("ContextMenuButton",
                        GOJS(go.TextBlock, "Edit"),
                        {click: editStep})
                    // more ContextMenuButtons would go here
                )  // end Adornment
        }
        )
    ;
    myDiagram.nodeTemplateMap.add(typename, node);
}

function newStepTemplate(name, inList, outList) {
    var inNum = inList.length;
    var outNum = outList.length;

    var inPorts = [];
    var outPorts = [];
    for (var i = 0; i < inNum; ++i) {
        var port = makePort(inList[i], true);
        inPorts.push(port);
    }

    for (var i = 0; i < outNum; ++i) {
        var port = makePort(outList[i], false);
        outPorts.push(port);
    }

    makeTemplate(name, inPorts, outPorts);
}

function clearEdit() {
    $('#step-name').val("");
    $('#step-command').val("");
}

function extractInputs(commandline) {
    var inputs = [];
    var re = /<([A-Za-z0-9_./#]+)>/g;
    var tempR;
    while (tempR = re.exec(commandline)) {
        inputs.push(tempR[1]);
    }
    return inputs;
}

function extractOutputs(commandline) {
    var outputs = [];
    var re = /\[([A-Za-z0-9_./#]+)\]/g;
    var tempR;
    while (tempR = re.exec(commandline)) {
        outputs.push(tempR[1]);
    }
    return outputs;
}

function findMacro(name) {
    for (var i = 0; i < macros.length; ++i) {
        if (macros[i] === name) {
            return i;
        }
    }
    return -1;
}

function removeMacros(commandLine) {
    var re = /#([A-Z][A-Z0-9_]*)#/g;
    var m;
    do {
        m = re.exec(commandLine);
        if (m) {
            var index = findMacro(m[1]);
            if (index >= 0) {
                console.log("remove macro:" + m[1]);
                macros.splice(index, 1);
            }
        }
    } while (m);
}

function extractMacros(text) {
    var re = /#([A-Z][A-Z0-9_]*)#/g;
    var m;
    do {
        m = re.exec(text);
        if (m) {
            if (findMacro(m[1]) < 0) {
                console.log("add macro:" + m[1]);
                macros.push(m[1]);
            }
        }
    } while (m);
}

var current = "";

function editStep(e, obj) {
    clearEdit();
    $("#title").text("Edit Step");
    var node = obj.part;
    var nodedata = node.data;
    var config = nodedata.config;
    $('#step-name').val(config.stepName);
    $('#step-command').val(config.commandLine);
    $('#edit').modal('show');
    current = config.stepName;
    console.log("current:" + current);
}

function isCurrentAndUpdateSave(stepName, commandLine) {

    var inputs = extractInputs(commandLine);
    var outputs = extractOutputs(commandLine);
    var inputsString = inputs.sort().toString();
    var outputsString = outputs.sort().toString();

    var oldKey = "Step" + "-" + current;
    var nodeData = myDiagram.model.findNodeDataForKey(oldKey);
    var config = nodeData.config;
    var oldCommandLine = config.commandLine;

    var oldInputs = extractInputs(oldCommandLine);
    var oldOutputs = extractOutputs(oldCommandLine);

    var oldInputsString = oldInputs.sort().toString();
    var oldOutputsString = oldOutputs.sort().toString();


    if (current !== stepName) {
        return true
    }

    if (oldInputsString !== inputsString) {
        return true;
    }

    if (oldOutputsString !== outputsString) {
        return true;
    }

    return false;
}

function update(stepName, commandLine) {
    if (current === "") {
        return
    }
    var key = "Step" + "-" + current;
    var isModify = isCurrentAndUpdateSave(stepName, commandLine);
    console.log("isCurrentAndUpdateSave：" + isModify);
    // 如果接口改变，删除template，删除node，重新插入
    if (isModify) {
        var node = myDiagram.findNodeForKey(key);
        var nodeData = myDiagram.model.findNodeDataForKey(key);
        var config = nodeData.config;
        removeMacros(config.commandLine);
        myDiagram.startTransaction("delete node");
        myDiagram.remove(node);
        myDiagram.commitTransaction("delete node");
        myDiagram.nodeTemplateMap.remove(key);
        insert(stepName, commandLine);
    } else {
        // 只改变nodeData 重新提取宏
        var nodeData = myDiagram.model.findNodeDataForKey(key);
        var config = nodeData.config;
        // 删除旧宏
        removeMacros(config.commandLine);
        // 新增宏
        extractMacros(commandLine);
        myDiagram.startTransaction("delete node data");
        myDiagram.model.removeNodeData(nodeData);
        myDiagram.commitTransaction("delete node data");
        nodeData.config.commandLine = commandLine;
        myDiagram.startTransaction("change node data");
        myDiagram.model.addNodeData(nodeData);
        myDiagram.commitTransaction("chage node data");
    }
}

function insert(stepName, commandLine) {

    extractMacros(commandLine);
    var inputs = extractInputs(commandLine);
    var outputs = extractOutputs(commandLine);

    var key = "Step" + '-' + stepName;
    newStepTemplate(key, inputs, outputs);
    var config = {
        "stepName": stepName,
        "commandLine": commandLine
    };

    // add step
    myDiagram.startTransaction('add node');
    var nodeData = {
        "key": key,
        "type": key,
        "name": stepName,
        "config": config
    };

    myDiagram.model.addNodeData(nodeData);
    var part = myDiagram.findPartForData(nodeData);
    part.location = myDiagram.toolManager.contextMenuTool.mouseDownPoint;
    myDiagram.commitTransaction('add node');

    myDiagram.rebuildParts();
}

function saveStep() {
    var title = $("#title").text();
    var stepName = $("#step-name").val();
    var commandLine = $("#step-command").val();

    if ($.trim(stepName) === "") {
        alert("step name can't be empty");
        return
    }
    var re = /([a-z0-9_]+)/g;
    var m = re.exec(stepName);
    if (m === null) {
        alert("step name can only consist of a-z,0-9 and _");
        return;
    }
    if (m[1] !== m.input) {
        alert("step name can only consist of a-z,0-9 and _");
        return;
    }

    if ($.trim(commandLine) === "") {
        alert("command line empty");
        return
    }
    var key = "Step-" + stepName;
    if (title === "New Step") {

        if (myDiagram.nodeTemplateMap.get(key)) {
            alert("step already exists.");
            return;
        }

        insert(stepName, commandLine);
    }

    if (title === "Edit Step") {
        if (current != stepName) {
            console.log("current:" + current);
            console.log("stepName:" + stepName);
            if (myDiagram.nodeTemplateMap.get(key)) {
                alert("step already exists.");
                return;
            }
        }
        update(stepName, commandLine);
    }

    $('#edit').modal('hide');
}

function generate(nodes, links) {
    var workflow = {};
    workflow["nodes"] = [];
    workflow["links"] = [];

    for (var i = 0; i < nodes.length; ++i) {
        var stepName = nodes[i].config.stepName;
        var commandLine = nodes[i].config.commandLine;
        var node = {};
        node.name = stepName;
        node.cmd = commandLine;
        workflow["nodes"].push(node);
    }
    for (var i = 0; i < links.length; i++) {
        var from = links[i].from;
        var to = links[i].to;
        var frompid = links[i].frompid;
        var topid = links[i].topid;

        var link = {};
        link.from = from;
        link.to = to;
        link.frompid = frompid;
        link.topid = topid;
        workflow["links"].push(link);
    }
    return workflow;
}


function rebuild(workflow) {
    var nodes = workflow.nodes;
    for (var i = 0; i < nodes.length; ++i) {
        var name = nodes[i].name;
        var cmd = nodes[i].cmd;
        insert(name, cmd);
    }

    var links = workflow.links;

    for (var i = 0; i < links.length; ++i) {
        myDiagram.startTransaction('add link');
        var link = {
            "from": links[i].from,
            "to": links[i].to,
            "frompid": links[i].frompid,
            "topid": links[i].topid
        };
        myDiagram.model.addLinkData(link);
        myDiagram.commitTransaction('add link');
    }

}

