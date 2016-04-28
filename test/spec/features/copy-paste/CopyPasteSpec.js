'use strict';

var TestHelper = require('../../../TestHelper'),
    canvasEvent = require('../../../util/MockEvents').createCanvasEvent;

/* global bootstrapDiagram, inject, sinon */

var forEach = require('lodash/collection/forEach');

var copyPasteModule = require('../../../../lib/features/copy-paste'),
    selectionModule = require('../../../../lib/features/selection'),
    modelingModule = require('../../../../lib/features/modeling'),
    rulesModule = require('./rules');


describe('features/copy-paste - ', function() {

  beforeEach(bootstrapDiagram({
    modules: [ rulesModule, modelingModule, copyPasteModule, selectionModule ]
  }));


  function toObjectBranch(branch) {
    var newBranch = {};

    forEach(branch, function(elem) {
      newBranch[elem.id] = elem;
    });

    return newBranch;
  }

  describe('basics', function() {

    var rootShape, parentShape, parentShape2, host, attacher, childShape, childShape2, connection;

    beforeEach(inject(function(elementFactory, canvas, modeling) {

      rootShape = elementFactory.createRoot({
        id: 'root'
      });

      canvas.setRootElement(rootShape);

      parentShape = elementFactory.createShape({
        id: 'parent',
        x: 600, y: 200,
        width: 600, height: 300
      });

      canvas.addShape(parentShape, rootShape);

      parentShape2 = elementFactory.createShape({
        id: 'parent2',
        x: 90, y: 15,
        width: 425, height: 300
      });

      canvas.addShape(parentShape2, rootShape);

      host = elementFactory.createShape({
        id:'host',
        x: 300, y: 50,
        width: 100, height: 100
      });

      canvas.addShape(host, parentShape2);

      attacher = elementFactory.createShape({
        id: 'attacher',
        x: 375, y: 25,
        width: 50, height: 50
      });

      canvas.addShape(attacher, parentShape2);

      modeling.updateAttachment(attacher, host);

      childShape = elementFactory.createShape({
        id: 'childShape',
        x: 110, y: 110,
        width: 100, height: 100
      });

      canvas.addShape(childShape, parentShape2);

      childShape2 = elementFactory.createShape({
        id: 'childShape2',
        x: 400, y: 200,
        width: 100, height: 100
      });

      canvas.addShape(childShape2, parentShape2);

      connection = elementFactory.createConnection({
        id: 'connection',
        waypoints: [
          { x: 160, y: 160 },
          { x: 450, y: 250 }
        ],
        source: childShape,
        target: childShape2
      });

      canvas.addConnection(connection, parentShape2);
    }));


    describe('copy', function () {

      it('should copy parent + children, when element is selected', inject(function(copyPaste, clipboard) {
        // when
        copyPaste.copy([ parentShape2 ]);

        var tree = clipboard.get();

        // then
        expect(toObjectBranch(tree[0])).to.have.keys('parent2');

        expect(toObjectBranch(tree[1])).to.have.keys('host', 'childShape', 'childShape2', 'connection');
      }));


      it('should copy attachers + connections', inject(function(copyPaste, clipboard) {
        // when
        copyPaste.copy([ host, childShape, childShape2 ]);

        var tree = clipboard.get();

        // then
        expect(toObjectBranch(tree[0])).to.have.keys('host', 'childShape', 'childShape2', 'connection');
      }));


      it('should not copy connection without target or source', inject(function(copyPaste, clipboard) {
        var tree;

        // when
        copyPaste.copy([ childShape2, connection ]);

        tree = clipboard.get();

        // then
        expect(toObjectBranch(tree[0])).to.not.have.keys('connection');
        expect(tree[1]).to.be.empty;

        // when
        copyPaste.copy([ childShape, connection ]);

        tree = clipboard.get();

        // then
        expect(toObjectBranch(tree[0])).to.not.have.keys('connection');
        expect(tree[1]).to.be.empty;
      }));


      it('should not copy attacher based on rules', inject(function(copyPaste, clipboard) {
        // given
        copyPaste.copy(attacher);

        var tree = clipboard.get();

        // then
        expect(toObjectBranch(tree[0])).to.not.have.keys('attacher');
      }));

    });

    describe('paste', function () {

      it('should paste', inject(function(copyPaste, selection, elementFactory, canvas) {
        // when
        copyPaste.copy([ host, childShape ]);

        copyPaste.paste({
          element: parentShape,
          point: {
            x: 900,
            y: 350
          }
        });

        // then
        expect(parentShape.children).to.have.length(2);
      }));


      it('should not paste connections based on rules', inject(function(copyPaste, clipboard) {
        // given
        copyPaste.copy([ childShape, childShape2 ]);

        copyPaste.paste({
          element: parentShape,
          point: {
            x: 900,
            y: 350
          }
        });

        // then
        expect(parentShape.children).to.have.length(2);
      }));


      it('should reject overall paste of elements based on rules', inject(function(copyPaste, clipboard, eventBus) {
        // given
        var listener = sinon.spy();

        eventBus.on('elements.paste.rejected', listener);

        // when
        copyPaste.copy([ childShape, childShape2 ]);

        copyPaste.paste({
          element: parentShape2,
          point: {
            x: 900,
            y: 350
          }
        });

        // then
        expect(listener).to.have.been.called;
      }));

    });

  });

  describe('#createTree', function () {
    var sB = { id: 'b', parent: { id: 'a' }, x: 0, y: 0, width: 100, height: 100 },
        sC = { id: 'c', parent: sB, x: 0, y: 0, width: 100, height: 100 },
        sD = { id: 'd', parent: sB, x: 0, y: 0, width: 100, height: 100 },
        sE = { id: 'e', parent: { id: 'y' }, x: 0, y: 0, width: 100, height: 100 },
        sF = { id: 'f', parent: sE, x: 0, y: 0, width: 100, height: 100 },
        sG = { id: 'g', parent: sF, x: 0, y: 0, width: 100, height: 100 },
        sW = { id: 'w', parent: { id: 'z' }, x: 0, y: 0, width: 100, height: 100 };

    var cA = { id: 'connA', parent: sB, source: sC, target: sD,
               waypoints: [ { x: 0, y: 0, original: { x: 50, y: 50 } } ] },
        cB = { id: 'connB', parent: { id: 'p' }, source: sC, target: sW,
               waypoints: [ { x: 0, y: 0 } ] };

    var host = { id: 'host', parent: { id: 't' }, x: 0, y: 0, width: 100, height: 100 },
        attacher = { id: 'attacher', parent: { id: 't' }, x: 0, y: 0, width: 100, height: 100 };

    sB.children = [ sC, sD, cA ];
    sF.children = [ sG ];
    sE.children = [ sF ];

    sC.outgoing = cA;
    sD.incoming = cA;

    host.attachers = [ attacher ];
    attacher.host = host;


    it('should create tree of shapes', inject(function(copyPaste) {
      // when
      var tree = copyPaste.createTree([ sE, sF, sG ]);

      var branchZero = toObjectBranch(tree[0]),
          branchOne = toObjectBranch(tree[1]),
          branchTwo = toObjectBranch(tree[2]);

      // then
      expect(branchZero.e).to.exist;
      expect(branchZero.e.parent).to.equal('y');

      expect(branchOne.f).to.exist;
      expect(branchOne.f.parent).to.equal('e');

      expect(branchTwo.g).to.exist;
      expect(branchTwo.g.parent).to.equal('f');
    }));


    it('should create a tree of shapes and connections', inject(function(copyPaste) {
      // when
      var tree = copyPaste.createTree([ sB, sC, sD, sE, sF, sG, cA, cB ]);

      var branchZero = toObjectBranch(tree[0]),
          branchOne = toObjectBranch(tree[1]),
          branchTwo = toObjectBranch(tree[2]);

      // then
      expect(branchZero).to.have.keys('b', 'e');
      expect(branchOne).to.have.keys('c', 'd', 'f', 'connA');
      expect(branchTwo).to.have.keys('g');

      expect(branchOne).to.not.have.keys('connB');

      expect(branchOne.c.parent).to.equal('b');

      expect(branchOne.connA.source).to.equal('c');
      expect(branchOne.connA.target).to.equal('d');
    }));


    it('should create a tree of everything', inject(function(copyPaste) {
      // when
      var tree = copyPaste.createTree([ sB, sC, sD, sE, sF, sG, cA, cB, host ]);

      var branchZero = toObjectBranch(tree[0]),
          branchOne = toObjectBranch(tree[1]),
          branchTwo = toObjectBranch(tree[2]);

      // then
      expect(branchZero).to.have.keys('b', 'e', 'host');
      expect(branchOne).to.have.keys('c', 'd', 'f', 'connA');
      expect(branchTwo).to.have.keys('g');
    }));

  });

});