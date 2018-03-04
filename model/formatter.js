sap.ui.define([
	] , function () {
		"use strict";

		return {

			/**
			 * Rounds the number unit value to 2 digits
			 * @public
			 * @param {string} sValue the number string to be rounded
			 * @returns {string} sValue with 2 digits rounded
			 */
			numberUnit : function (sValue) {
				if (!sValue) {
					return "";
				}
				return parseFloat(sValue).toFixed(2);
			},
			
			/**
			 * Concatenates message popover title
			 * @public
			 * @param {string} sUcSource the picking source
			 * @param {sUcDestination} StorageSection the picking destination
			 * @returns {string} sValue with fields concatenated
			 */
			setMessagePopoverTitle: function(sUcSource, sUcDestination) {
				return "UC: " + sUcSource + " / " + sUcDestination;
			},
			
			/**
			 * Sets the message popover count
			 * @public
			 * @param {object} oObject the model that carries message popover details
			 * @returns {string} sValue with message count
			 */
			setMessageCount : function(oObject) {
				return oObject.count > 0 ? oObject.count : "";
			},
			
			/**
			 * Checks whether any message available
			 * @public
			 * @param {integer} iCount the total messages count
			 * @returns {boolean} bValue with boolean expression result
			 */
			isAnyMessageAvailable: function (iCount) {
				return iCount > 0;
			},

			/**
			 * Rounds the number unit value to 2 digits
			 * @public
			 * @param {string} sValue the number string to be rounded
			 * @returns {string} sValue with 2 digits rounded
			 */
			notfoundText: function(i18text, UCsource) {
				return i18text + " " + UCsource;
			}

		};

	}
);