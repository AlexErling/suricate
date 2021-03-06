/*
 * Copyright 2012-2018 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.suricate.monitoring.model.enums;

import org.springframework.http.HttpStatus;

/**
 * Api Errors
 */
public enum ApiErrorEnum {

    TOKEN_MISSING("Missing or invalid Authorization header", "token.missing", HttpStatus.BAD_REQUEST),
    TOKEN_EXPIRED("Token expired", "token.expired", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID("Invalid token", "token.invalid", HttpStatus.UNAUTHORIZED),
    USER_NOT_FOUND("User not found","user.not.found", HttpStatus.NOT_FOUND),
    USER_CREATION_ERROR("Error when creating user","user.creation.error", HttpStatus.INTERNAL_SERVER_ERROR),
    PROJECT_NOT_FOUND("Project not found","project.not.found", HttpStatus.NOT_FOUND),
    PROJECT_INVALID_CONSTANCY("Project invalid consistency","project.invalid.consistency", HttpStatus.CONFLICT),
    AUTHENTICATION_ERROR("Authentication error : Token expired or invalid", "authentication.error", HttpStatus.UNAUTHORIZED),
    OPERATION_NOT_AUTHORIZED("Operation not authorized", "operation.not.authorized", HttpStatus.UNAUTHORIZED),
    DATABASE_INIT_ISSUE("Database Init error", "database.init.error", HttpStatus.INTERNAL_SERVER_ERROR);

    private String message;

    private int code;

    private String key;

    private HttpStatus status;

    ApiErrorEnum(String message, String key, HttpStatus status) {
        this.status = status;
        this.message = message;
        this.code = ordinal();
        this.key = key;
    }

    public String getMessage() {
        return message;
    }
    public int getCode() {
        return code;
    }
    public String getKey() {
        return key;
    }
    public HttpStatus getStatus() {
        return status;
    }
}
