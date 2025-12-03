# Test updating fragments via PUT /v1/fragments/:id

# 1. Create a text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
This is the original content

HTTP 201
[Captures]
fragment_url: header "Location"
fragment_id: jsonpath "$.fragment.id"
original_created: jsonpath "$.fragment.created"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 29

# 2. Update the fragment with new content
PUT {{fragment_url}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
This is the updated content!!!

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment_id}}
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 33
jsonpath "$.fragment.created" == {{original_created}}
jsonpath "$.fragment.updated" != {{original_created}}

# 3. Verify the updated content
GET {{fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP 200
Content-Type: text/plain
[Asserts]
body == "This is the updated content!!!"

# 4. Try to change the content type (should fail)
PUT {{fragment_url}}
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
{"key": "value"}

HTTP 400
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" contains "Cannot change fragment type"

# 5. Create a JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
{"name": "original", "count": 1}

HTTP 201
[Captures]
json_fragment_url: header "Location"
json_fragment_id: jsonpath "$.fragment.id"

# 6. Update the JSON fragment
PUT {{json_fragment_url}}
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
{"name": "updated", "count": 2, "active": true}

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{json_fragment_id}}
jsonpath "$.fragment.type" == "application/json"

# 7. Verify updated JSON content
GET {{json_fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP 200
Content-Type: application/json
[Asserts]
jsonpath "$.name" == "updated"
jsonpath "$.count" == 2
jsonpath "$.active" == true

# 8. Try to update another user's fragment (should fail)
PUT {{fragment_url}}
Content-Type: text/plain
[BasicAuth]
user2@email.com:password2
Trying to steal this fragment

HTTP 404
[Asserts]
jsonpath "$.status" == "error"

# 9. Clean up - delete the fragments
DELETE {{fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP 200

DELETE {{json_fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP 200
