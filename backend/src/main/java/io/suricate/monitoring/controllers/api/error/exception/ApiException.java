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

package io.suricate.monitoring.controllers.api.error.exception;


import io.suricate.monitoring.model.dto.error.ApiErrorDto;
import io.suricate.monitoring.model.enums.ApiErrorEnum;

/**
 * API Exception management
 */
public class ApiException extends RuntimeException{

    /**
     * API error
     */
    private final ApiErrorDto error;

    /**
     * Default constructor using field
     * @param error the API error object to store into the exception
     */
    public ApiException(ApiErrorEnum error) {
        super(error.getMessage());
        this.error = new ApiErrorDto(error);
    }

    /**
     * Method used to retrieve the error
     * @return the APi error
     */
    public ApiErrorDto getError() {
        return error;
    }
}
