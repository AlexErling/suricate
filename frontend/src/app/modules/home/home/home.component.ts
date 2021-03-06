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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {Project} from '../../../shared/model/dto/Project';
import {DashboardService} from '../../dashboard/dashboard.service';
import { takeWhile} from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  /**
   * True while the component is instantiate
   * @type {boolean}
   */
  private alive = true;

  /**
   * The list of dashboards
   */
  dashboards: Project[];

  /**
   * The constructor
   *
   * @param {DashboardService} dashboardService The dashboard service
   */
  constructor(private dashboardService: DashboardService) { }

  /**
   * Init objects
   */
  ngOnInit() {
    this.dashboardService
        .dashboardsSubject
        .pipe(takeWhile(() => this.alive))
        .subscribe( dashboards => this.dashboards = dashboards);
  }

  /**
   * Called when the component is destroy
   */
  ngOnDestroy() {
    this.alive = false;
  }

}
