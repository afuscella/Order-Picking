sap.ui.define([
		"pt/ewm/am/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("pt.ewm.am.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);