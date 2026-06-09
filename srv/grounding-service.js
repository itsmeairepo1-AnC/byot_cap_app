const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");

const DESTINATION_NAME = "python-api"; // must match your BTP Destination name

module.exports = function (srv) {

    srv.on("ask", async (req) => {
        const { question, max_chunks = 6 } = req.data;

        if (!question || question.length < 3) {
            return req.reject(400, "Question must be at least 3 characters.");
        }

        try {
            const response = await executeHttpRequest(
                { destinationName: DESTINATION_NAME },
                {
                    method: "post",
                    url: "/api/ask",
                    data: { question, max_chunks },
                    headers: { "Content-Type": "application/json" },
                }
            );
            return response.data;
        } catch (err) {
            const status = err.response?.status || 502;
            const detail =
                err.response?.data?.detail ||
                err.message ||
                "Failed to reach Python API";
            return req.reject(status, detail);
        }
    });
};
