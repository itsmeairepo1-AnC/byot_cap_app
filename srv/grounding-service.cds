service GroundingService @(path: '/grounding') {

    type AskResponse {
        question   : String;
        answer     : String;
        sources    : array of String;
        chunk_count: Integer;
        grounded   : Boolean;
    }

    action ask(question : String, max_chunks : Integer) returns AskResponse;
}
