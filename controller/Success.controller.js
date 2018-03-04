/*global location*/
sap.ui.define([
		"pt/ewm/am/controller/BaseController",
		"sap/ui/model/json/JSONModel"
	], function (
		BaseController,
		JSONModel
	) {
		"use strict";

		return BaseController.extend("pt.ewm.am.controller.Success", {
			
			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */
			
			/**
			 * Called when the success controller is instantiated.
			 * @public
			 */
			 
			onInit : function () {
				var oViewModel;
				
				// Model used to manipulate view control states
				oViewModel = this._createViewModel();
				this.setModel(oViewModel, "successView");
				
				this.getView().addEventDelegate({
					onAfterShow: function() {
						this._onAfterShow();
						
					}.bind(this)
				});
				
				this.getRouter().getRoute("success").attachPatternMatched(this._onConfirmMatched, this);
				
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */
			
			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			 
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			},
			
			
			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */
			
			/**
			 * Binds the view to the object path.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			 
			_onConfirmMatched : function (oEvent) {
				var oViewModel = this.getModel("successView"),
					 sObjectId =  oEvent.getParameter("arguments").objectId;

				// No data for the binding
				if (!sObjectId) {
					this.getRouter().getTargets().display("objectNotFound");
					return;
				}
				var oResourceBundle = this.getResourceBundle();
					
				// Everything went fine.
				oViewModel.setProperty("/text", oResourceBundle.getText("successText", [sObjectId]));
				
			},
			
			/**
			 * Creates a JSONModel to be used in worklist view
			 * @function
			 * @returns {sap.uimodel.json.JSONModel} the model reference
			 * @private
			 */
			 
			_createViewModel : function () {
				return new JSONModel({
					text: this.getResourceBundle().getText("successText", [0]),
					linkText: this.getResourceBundle().getText("backToWorklist", [3])
				});
			},
			
			
			/**
			 * Handles jQuery event AfterShow, which runs after screen been rendering
			 * @function
			 * @private
			 */
			
			_onAfterShow : function () {
				this._wait(2000);
				this.onLinkPressed();
			},
			
			
			/**
			 * Makes the application waiting for a given period
			 * @function
			 * @param {sap.ui.model.type.Integer} iMilliseconds time in milliseconds
			 * @private
			 */
			 
			_wait : function (iMilliseconds) {
				var start = new Date().getTime();
				for (var i = 0; i < 1e7; i++) {
					if ((new Date().getTime() - start) > iMilliseconds){
						break;
				    }
				}
			}
			

		});

	}
);