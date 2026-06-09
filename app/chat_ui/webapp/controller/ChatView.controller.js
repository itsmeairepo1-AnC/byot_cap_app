sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat"
], (Controller, MessageToast, DateFormat) => {
    "use strict";

    return Controller.extend("chatuiapp.controller.ChatView", {

        onInit() {
            this._oTimeFormat = DateFormat.getTimeInstance({ pattern: "HH:mm" });
            this._renderMessages();
        },

        onAfterRendering: function () {
            var that = this;
            setTimeout(function () {
                that._attachInputKeyHandler();
            }, 0);
        },

        _attachInputKeyHandler: function () {
            var that = this;
            var oInput = this.byId("chatInput");
            if (!oInput) return;

            var oDomRef = oInput.getFocusDomRef();
            if (!oDomRef) {
                setTimeout(function () { that._attachInputKeyHandler(); }, 100);
                return;
            }

            if (this._fnInputKeyDown) {
                oDomRef.removeEventListener("keydown", this._fnInputKeyDown);
            }

            this._fnInputKeyDown = function (oEvent) {
                if ((oEvent.key === "Enter" || oEvent.keyCode === 13) && !oEvent.shiftKey) {
                    oEvent.preventDefault();
                    this.onSend();
                }
            }.bind(this);

            oDomRef.addEventListener("keydown", this._fnInputKeyDown);
        },

        onSend: function () {
            var oChatModel = this.getView().getModel("chat");
            var sInput = (oChatModel.getProperty("/inputValue") || "").trim();

            if (!sInput) return;

            this._addMessage("user", sInput);
            oChatModel.setProperty("/inputValue", "");
            oChatModel.setProperty("/busy", true);
            this._renderMessages();

            this._callAskAction(sInput);
        },

        _callAskAction: function (sQuestion) {
            var that = this;
            var oModel = this.getView().getModel();
            var oAction = oModel.bindContext("/ask(...)");

            oAction.setParameter("question", sQuestion);
            oAction.setParameter("max_chunks", 6);

            oAction.execute().then(function () {
                var oResult = oAction.getBoundContext().getObject();
                var sAnswer = oResult.answer || "No answer returned.";

                that._addMessage("assistant", sAnswer, {
                    sources: oResult.sources || [],
                    chunk_count: oResult.chunk_count,
                    grounded: oResult.grounded
                });

                that.getView().getModel("chat").setProperty("/busy", false);
                that._renderMessages();
            }).catch(function (oError) {
                var sMsg = "Something went wrong. Please try again.";
                try {
                    var oParsed = JSON.parse(oError.message);
                    sMsg = oParsed.message || oParsed.error?.message || sMsg;
                } catch (e) {
                    sMsg = oError.message || sMsg;
                }
                that._addMessage("assistant", sMsg, { isError: true });
                that.getView().getModel("chat").setProperty("/busy", false);
                that._renderMessages();
                MessageToast.show(sMsg);
            });
        },

        _addMessage: function (sRole, sText, oMeta) {
            var oChatModel = this.getView().getModel("chat");
            var aMessages = oChatModel.getProperty("/messages");
            aMessages.push({
                role: sRole,
                text: sText,
                time: this._oTimeFormat.format(new Date()),
                meta: oMeta || {},
                showSources: false
            });
            oChatModel.setProperty("/messages", aMessages);
        },

        _renderMessages: function () {
            var that = this;
            var oChatModel = this.getView().getModel("chat");
            var aMessages = oChatModel.getProperty("/messages");
            var bBusy = oChatModel.getProperty("/busy");
            var oMessageList = this.byId("messageList");

            oMessageList.destroyItems();

            // Welcome banner when no messages
            if (aMessages.length === 0 && !bBusy) {
                var oWelcome = new sap.m.VBox({
                    alignItems: "Center",
                    items: [
                        new sap.ui.core.Icon({ src: "sap-icon://da-2", size: "3rem", color: "#0a6ed1" }),
                        new sap.m.Text({ text: that._getText("appTitle") })
                            .addStyleClass("welcomeTitle sapUiSmallMarginTop"),
                        new sap.m.Text({ text: that._getText("welcomeMessage"), wrapping: true })
                            .addStyleClass("sapUiSmallMarginTop")
                    ]
                }).addStyleClass("welcomeBanner");
                oMessageList.addItem(oWelcome);
            }

            aMessages.forEach(function (oMsg, iIndex) {
                var bUser = oMsg.role === "user";

                var oAvatar = new sap.m.Avatar({
                    initials: bUser ? "U" : "AI",
                    displaySize: "XS",
                    backgroundColor: bUser ? "Accent6" : "Accent1"
                }).addStyleClass("bubbleAvatar");

                var aBubbleItems = [
                    new sap.m.Text({ text: oMsg.text, wrapping: true })
                ];

                // Grounding metadata for assistant messages
                if (!bUser && oMsg.meta && oMsg.meta.sources && oMsg.meta.sources.length > 0) {
                    var oGroundedBadge = new sap.m.Text({
                        text: oMsg.meta.grounded
                            ? ("✓ " + that._getText("groundedLabel"))
                            : ("○ " + that._getText("notGroundedLabel"))
                    }).addStyleClass("groundedBadge " + (oMsg.meta.grounded ? "grounded" : "notGrounded"));

                    var oSourcesVBox = new sap.m.VBox({
                        visible: oMsg.showSources,
                        items: oMsg.meta.sources.map(function (sSrc) {
                            return new sap.m.Text({ text: "• " + sSrc, wrapping: true })
                                .addStyleClass("sourceItem");
                        })
                    }).addStyleClass("sourcesPanel");

                    var oChunkInfo = new sap.m.Text({
                        text: that._getText("chunksLabel") + ": " + oMsg.meta.chunk_count,
                        wrapping: true,
                        visible: oMsg.showSources
                    }).addStyleClass("sapUiTinyMarginTop");

                    var oToggleLink = new sap.m.Link({
                        text: oMsg.showSources
                            ? that._getText("hideDetails")
                            : (that._getText("sourcesTitle") + " (" + oMsg.meta.sources.length + ")"),
                        press: function () {
                            aMessages[iIndex].showSources = !aMessages[iIndex].showSources;
                            oChatModel.setProperty("/messages", aMessages);
                            that._renderMessages();
                        }
                    }).addStyleClass("sapUiTinyMarginTop");

                    aBubbleItems.push(oGroundedBadge, oToggleLink, oChunkInfo, oSourcesVBox);
                }

                var oBubbleContent = new sap.m.VBox({ items: aBubbleItems })
                    .addStyleClass("bubbleContent");

                var oTimeText = new sap.m.Text({ text: oMsg.time })
                    .addStyleClass("bubbleTime");

                var oBubbleInner = new sap.m.VBox({ items: [oBubbleContent, oTimeText] });

                var oBubble = bUser
                    ? new sap.m.HBox({ items: [oBubbleInner, oAvatar] }).addStyleClass("messageBubble user")
                    : new sap.m.HBox({ items: [oAvatar, oBubbleInner] }).addStyleClass("messageBubble assistant");

                oMessageList.addItem(oBubble);
            });

            // Typing indicator
            if (bBusy) {
                var oTyping = new sap.m.HBox({
                    items: [
                        new sap.m.Avatar({ initials: "AI", displaySize: "XS", backgroundColor: "Accent1" })
                            .addStyleClass("bubbleAvatar"),
                        new sap.m.HBox({
                            items: [new sap.ui.core.HTML({
                                content: "<div class='typingDots'><span></span><span></span><span></span></div>"
                            })]
                        })
                    ]
                }).addStyleClass("typingIndicator");
                oMessageList.addItem(oTyping);
            }

            // Scroll to bottom
            setTimeout(function () {
                var oScroll = that.byId("chatScrollContainer");
                if (oScroll) {
                    var oDom = oScroll.getDomRef();
                    if (oDom) oDom.scrollTop = oDom.scrollHeight;
                }
            }, 100);
        },

        _getText: function (sKey) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey);
        }

    });
});
