# Test creating image fragments via POST /v1/fragments

# 1. POST a PNG image fragment
POST http://localhost:8080/v1/fragments
Content-Type: image/png
[BasicAuth]
user1@email.com:password1
# Minimal 1x1 red PNG image (binary data as hex)
hex,89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc00000030101001add8db4000000004945454e44ae426082;

HTTP 201
[Captures]
png_fragment_url: header "Location"
png_fragment_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
jsonpath "$.fragment.type" == "image/png"
jsonpath "$.fragment.size" == 70
header "Location" matches "^http://localhost:8080/v1/fragments/[0-9a-fA-F-]+$"

# 2. GET the PNG image fragment data
GET {{png_fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP 200
Content-Type: image/png
[Asserts]
header "Content-Type" == "image/png"
header "Content-Length" == "70"
bytes count == 70

# 3. GET the PNG image fragment metadata
GET {{png_fragment_url}}/info
[BasicAuth]
user1@email.com:password1

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{png_fragment_id}}
jsonpath "$.fragment.type" == "image/png"
jsonpath "$.fragment.size" == 70

# 4. POST a JPEG image fragment
POST http://localhost:8080/v1/fragments
Content-Type: image/jpeg
[BasicAuth]
user1@email.com:password1
hex,ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103011100021101031101ffc4001500010100000000000000000000000000000000ffc400140100000000000000000000000000000000ffda000c03010002110311003f00a10000ffff00ffd9;

HTTP 201
[Captures]
jpeg_fragment_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/jpeg"

# 5. List all fragments and verify both images exist
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" contains {{png_fragment_id}}
jsonpath "$.fragments" contains {{jpeg_fragment_id}}

# 6. DELETE the PNG fragment
DELETE {{png_fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

# 7. Verify PNG fragment is deleted
GET {{png_fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP 404
