sap.ui.define([
    "sap/ui/core/UIComponent",
    "chatuiapp/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("chatuiapp.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this.setModel(models.createChatModel(), "chat");
            this.getRouter().initialize();
        }
    });
});
