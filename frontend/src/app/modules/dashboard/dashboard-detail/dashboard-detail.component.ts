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

import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DashboardService} from '../dashboard.service';
import {Project} from '../../../shared/model/dto/Project';
import {DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {Observable} from 'rxjs/Observable';
import {map, takeWhile} from 'rxjs/operators';
import {of} from 'rxjs/observable/of';
import {AuthenticationService} from '../../authentication/authentication.service';
import {AbstractHttpService} from '../../../shared/services/abstract-http.service';
import {WSConfiguration} from '../../../shared/model/websocket/WSConfiguration';
import {WebsocketService} from '../../../shared/services/websocket.service';
import {Subscription} from 'rxjs/Subscription';
import {NumberUtils} from '../../../shared/utils/NumberUtils';
import {WSUpdateEvent} from '../../../shared/model/websocket/WSUpdateEvent';
import {WSUpdateType} from '../../../shared/model/websocket/enums/WSUpdateType';
import {ProjectWidget} from '../../../shared/model/dto/ProjectWidget';
import {NgGridItemEvent} from 'angular2-grid';
import {ProjectWidgetPosition} from '../../../shared/model/dto/ProjectWidgetPosition';
import {MatDialog} from '@angular/material';
import {DeleteProjectWidgetDialogComponent} from '../components/delete-project-widget-dialog/delete-project-widget-dialog.component';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {AddWidgetDialogComponent} from '../../../shared/components/pages-header/components/add-widget-dialog/add-widget-dialog.component';
import {EditProjectWidgetDialogComponent} from '../components/edit-project-widget-dialog/edit-project-widget-dialog.component';

/**
 * Component that display a specific dashboard
 */
@Component({
  selector: 'app-dashboard-detail',
  templateUrl: './dashboard-detail.component.html',
  styleUrls: ['./dashboard-detail.component.css']
})
export class DashboardDetailComponent implements OnInit, OnDestroy, AfterViewInit {

  /**
   * Define the min bound for the screen code random generation
   *
   * @type {number} The min bound
   */
  private readonly MIN_SCREEN_CODE_BOUND = 100000;

  /**
   * Define the max bound for the screen code random generation
   *
   * @type {number} The max bound
   */
  private readonly MAX_SCREEN_CODE_BOUND = 999999;

  /**
   * Used for keep the subscription of subjects/Obsevables open
   *
   * @type {boolean} True if we keep the connection, False if we have to unsubscribe
   */
  isAlive = true;

  /**
   * The project as observable
   */
  project$: Observable<Project>;

  /**
   * The options for the plugin angular2-grid
   */
  gridOptions: {};

  /**
   * Save every web socket subscriptions event
   */
  websocketSubscriptions: Subscription[] = [];

  /**
   * Screen code used for websocket communication as clientId
   */
  screenCode: number;

  /**
   * True if the grid items has been initialized false otherwise
   */
  isGridItemInit = false;

  /**
   * The list of projectWidgets rendered by the ngFor
   */
  @ViewChildren('projectWidgetsRendered') projectWidgetsRendered: QueryList<any>;

  /**
   * constructor
   *
   * @param {ActivatedRoute} activatedRoute The activated route service
   * @param {DashboardService} dashboardService The dashboard service
   * @param {ChangeDetectorRef} changeDetectorRef The change detector service
   * @param {DomSanitizer} domSanitizer The domSanitizer service
   * @param {MatDialog} matDialog The material dialog service
   * @param {WebsocketService} websocketService The websocket service
   */
  constructor(private activatedRoute: ActivatedRoute,
              private dashboardService: DashboardService,
              private changeDetectorRef: ChangeDetectorRef,
              private domSanitizer: DomSanitizer,
              private matDialog: MatDialog,
              private websocketService: WebsocketService) { }

  /* ******************************************************* */
  /*                  Component Life cycle                   */
  /* ******************************************************* */

  /**
   * Init objects
   */
  ngOnInit() {
    // init current dashboard
    this.subcribeToProjectSubject();

    // Global init from project
    this.activatedRoute.params.subscribe( params => {
      this.dashboardService
          .getOneById(+params['id'])
          .subscribe(project => {
            this.initGridStackOptions(project);
            // Unsubcribe every websockets if we have change of dashboard
            this.unsubscribeToWebsockets();
            // Screen code generation
            this.screenCode = NumberUtils.getRandomIntBetween(this.MIN_SCREEN_CODE_BOUND, this.MAX_SCREEN_CODE_BOUND);
            // Subscribe to the new dashboard
            this.createWebsocketConnection(project);
            this.dashboardService.currendDashbordSubject.next(project);
          });
    });
  }

  /**
   * Called when the view has been init
   */
  ngAfterViewInit() {
    // Check when the projectWidgets *ngFor is ended
    this.projectWidgetsRendered
        .changes
        .subscribe((projectWidgetElements: QueryList<any>) => {
          this.isGridItemInit = true;
          this.bindDeleteProjectWidgetEvent(projectWidgetElements);
          this.bindEditProjectWidgetEvent(projectWidgetElements);
        });
  }

  /**
   * Called when the component is getting destroy
   */
  ngOnDestroy() {
    this.isAlive = false;
    this.unsubscribeToWebsockets();
  }

  /* ******************************************************* */
  /*              Component initialisation                   */
  /* ******************************************************* */

  /**
   * Init the Project subject subscription
   */
  subcribeToProjectSubject() {
    this
        .dashboardService
        .currendDashbordSubject
        .pipe(takeWhile(() => this.isAlive))
        .subscribe(project => this.project$ = of(project) );
  }

  /* ******************************************************* */
  /*                  Grid Stack Management                  */
  /* ******************************************************* */

  /**
   * Init the options for Grid Stack plugin
   *
   * @param {Project} project The project used for the initialization
   */
  initGridStackOptions(project: Project) {
    this.gridOptions = {
      'max_cols': project.maxColumn,
      'min_cols': 1,
      'row_height': project.widgetHeight / 1.5,
      'margins': [2],
      'auto_resize': true
    };
  }

  /* *********  Common (Grid + Widget) CSS Management ******* */

  /**
   * Get the CSS for the grid
   *
   * @param {Project} project The project
   * @returns {SafeHtml} The css as safe html
   */
  getGridCSS(css: string): string {
    return `
      <style>
        .grid {
          ${css}
        }
      </style>
    `;
  }

  /**
   * Get the oommon css for each widget
   *
   * @returns {SafeHtml} AS safe HTML
   */
  getWidgetCommonCSS(): string {
    return `
      <style>
        .grid-item h1 {
            margin-bottom: 12px;
            text-align: center;
            font-size: 1em;
            font-weight: 400;
            margin-right: 10px;
            margin-left: 10px;
          }
          .grid-item h2 {
            text-transform: uppercase;
            font-size: 3em;
            font-weight: 700;
            color: #fff;
          }
          .grid .widget a {
            text-decoration: none;
          }
          .grid-item p {
            padding: 0;
            margin: 0;
          }
          .grid-item .more-info {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.6em;
            position: absolute;
            bottom: 32px;
            left: 0;
            right: 0;
          }
          .grid-item .updated-at {
            font-size: 15px;
            position: absolute;
            bottom: 12px;
            left: 0;
            right: 0;
            color: rgba(0, 0, 0, 0.3);
          }
          .grid-item > div {
            position: relative;
            top: 50%;
            transform: translateY(-50%);
          }
          ${this.getActionButtonsCss()}
        </style>
    `;
  }

  /* ************ Unique Widget HTML and CSS Management ************* */

  /**
   * Get the html/CSS code for the widget
   *
   * @param {ProjectWidget} projectWidget The widget
   * @returns {SafeHtml} The html as SafeHtml
   */
  getHtmlAndCss(projectWidget: ProjectWidget): string {
    return `
      <style>
        ${projectWidget.widget.cssContent}
        ${projectWidget.customStyle ? projectWidget.customStyle  : '' }
      </style>

      ${this.getActionButtonsHtml(projectWidget)}
      ${projectWidget.instantiateHtml}
    `;
  }

  /* *************** Widget Action buttons (CSS, HTML, Bindings) ************** */
  /**
   * Get the css for widget action buttons
   *
   * @returns {string}
   */
  getActionButtonsCss(): string {
    return `
      .widget .btn-widget {
        position: absolute;
        background-color: rgba(66,66,66,0.6);
        color: #cfd2da;
        border: none;
        cursor: pointer;
        z-index: 20;
      }
      .widget .btn-widget .material-icons {
        font-size: 16px;
      }
      .widget .btn-widget.btn-widget-delete {
        right: 0;
      }
      .widget .btn-widget.btn-widget-edit {
        right: 34px;
      }
    `;
  }

  /**
   * Get the html for the action buttons
   *
   * @param {ProjectWidget} projectWidget The project widget
   * @returns {string} The html string
   */
  getActionButtonsHtml(projectWidget: ProjectWidget): string {
    return `
      <button id="delete-${projectWidget.id}"
              name="delete-${projectWidget.id}"
              class="btn-widget btn-widget-delete"
              role="button"
              data-project-widget-id="${projectWidget.id}"
              aria-disabled="false">
        <mat-icon class="material-icons">delete_forever</mat-icon>
      </button>

      <button id="edit-${projectWidget.id}"
              name="edit-${projectWidget.id}"
              class="btn-widget btn-widget-edit"
              role="button"
              data-project-widget-id="${projectWidget.id}"
              aria-disabled="false">
        <mat-icon class="material-icons">edit</mat-icon>
      </button>
    `;
  }

  /**
   * Bind delete events for each delete button element
   *
   * @param {QueryList<any>} projectWidgetElements The project widget elements
   */
  bindDeleteProjectWidgetEvent(projectWidgetElements: QueryList<any>) {
    projectWidgetElements.forEach((projectWidgetElement: ElementRef) => {
      const deleteButton: any = projectWidgetElement.nativeElement.querySelector('.btn-widget-delete');
      if (deleteButton) {
        fromEvent<MouseEvent>(deleteButton, 'click')
            .pipe(
                takeWhile(() => this.isAlive && this.isGridItemInit),
                map((mouseEvent: MouseEvent) => mouseEvent.toElement.closest('.widget').querySelector('.btn-widget-delete'))
            )
            .subscribe((deleteButtonElement: any) => {
              this.deleteProjectWidgetFromDashboard(+deleteButtonElement.getAttribute('data-project-widget-id'));
            });
      }
    });
  }

  /**
   * Bind edit events for each edit button elements
   *
   * @param {QueryList<any>} projectWidgetElements The list of elements
   */
  bindEditProjectWidgetEvent(projectWidgetElements: QueryList<any>) {
    projectWidgetElements.forEach((projectWidgetElement: ElementRef) => {
      const editButton: any = projectWidgetElement.nativeElement.querySelector('.btn-widget-edit');
      if (editButton) {
        fromEvent<MouseEvent>(editButton, 'click')
            .pipe(
                takeWhile(() => this.isAlive && this.isGridItemInit),
                map((mouseEvent: MouseEvent) => mouseEvent.toElement.closest('.widget').querySelector('.btn-widget-edit'))
            )
            .subscribe((editButtonElement: any) => {
              this.editProjectWidgetFromDashboard(+editButtonElement.getAttribute('data-project-widget-id'));
            });
      }
    });

  }

  /* ******************************************************* */
  /*                  Websocket Management                   */
  /* ******************************************************* */

  /**
   * Unsubcribe and disconnect from websockets
   */
  unsubscribeToWebsockets() {
    this.websocketSubscriptions.forEach( (websocketSubscription: Subscription, index: number) => {
      this.websocketService.unsubscribe(websocketSubscription);
      this.websocketSubscriptions.splice(index, 1);
    });

    this.websocketService.disconnect();
  }

  /**
   * Create the dashboard websocket connection
   *
   * @param {Project} project The project wanted for the connection
   */
  createWebsocketConnection(project: Project) {
    const websocketConfiguration: WSConfiguration = {
      host: `${AbstractHttpService.BASE_WS_URL}?${AbstractHttpService.SPRING_ACCESS_TOKEN_ENPOINT}=${AuthenticationService.getToken()}`,
      debug: true,
      queue: {'init': false}
    };

    this.websocketService
        .connect(websocketConfiguration)
        .subscribe(() => {
          const uniqueSubscription: Subscription = this.websocketService
              .subscribe(
                  `/user/${project.token}-${this.screenCode}/queue/unique`,
                  this.handleUniqueScreenEvent.bind(this)
              );

          const globalSubscription: Subscription = this.websocketService
              .subscribe(
                  `/user/${project.token}/queue/live`,
                  this.handleGlobalScreenEvent.bind(this)
              );

          this.websocketSubscriptions.push(uniqueSubscription);
          this.websocketSubscriptions.push(globalSubscription);
        });
  }

  /**
   * Manage the event sent by the server (destination : A specified screen)
   *
   * @param {WSUpdateEvent} updateEvent The message received
   * @param headers The headers of the websocket event
   */
  handleUniqueScreenEvent(updateEvent: WSUpdateEvent, headers: any) {
    console.log(`uniqueScreenEvent - ${updateEvent}`);
  }

  /**
   * Manage the event sent by the server (destination : Every screen connected to this project)
   *
   * @param {WSUpdateEvent} updateEvent The message received
   * @param headers The headers of the websocket event
   */
  handleGlobalScreenEvent(updateEvent: WSUpdateEvent, headers: any) {
    if (updateEvent.type === WSUpdateType.WIDGET) {
      const projectWidget: ProjectWidget = updateEvent.content;
      if (projectWidget) {
        this.dashboardService.updateWidgetHtmlFromProjetWidgetId(updateEvent.content.id, projectWidget.instantiateHtml);
      }
    }

    if (updateEvent.type === WSUpdateType.POSITION) {
      const currentProject: Project = this.dashboardService.currendDashbordSubject.getValue();
      this.dashboardService
          .getOneById(currentProject.id)
          .subscribe(project => {
            this.isGridItemInit = false;
            this.dashboardService.currendDashbordSubject.next(project);
          });
    }

    if (updateEvent.type === WSUpdateType.GRID) {
      const project: Project = updateEvent.content;
      if (project) {
        this.isGridItemInit = false;
        this.dashboardService.currendDashbordSubject.next(project);
      }
    }
  }

  /* ******************************************************* */
  /*                  REST Management                        */
  /* ******************************************************* */

  /**
   * Delete a project widget from a dashboard
   *
   * @param {number} projectWidgetId The project widget id to delete
   */
  deleteProjectWidgetFromDashboard(projectWidgetId: number) {
    const projectWidget: ProjectWidget = this.dashboardService.currendDashbordSubject.getValue()
                                             .projectWidgets
                                             .find((currentProjectWidget: ProjectWidget) => {
                                               return currentProjectWidget.id === projectWidgetId;
                                             });

    if (projectWidget) {
      const deleteProjectWidgetDialogRef = this.matDialog.open(DeleteProjectWidgetDialogComponent, {
        data: {projectWidget: projectWidget}
      });

      deleteProjectWidgetDialogRef.afterClosed().subscribe(shouldDeleteProjectWidget => {
        if (shouldDeleteProjectWidget) {
          this.dashboardService
              .deleteProjectWidgetFromProject(projectWidget.project.id, projectWidget.id)
              .subscribe();
        }
      });
    }
  }

  editProjectWidgetFromDashboard(projectWidgetId: number) {
    const projectWidget: ProjectWidget = this.dashboardService.currendDashbordSubject.getValue()
                                             .projectWidgets
                                             .find((currentProjectWidget: ProjectWidget) => {
                                               return currentProjectWidget.id === projectWidgetId;
                                             });

    if (projectWidget) {
      this.matDialog.open(EditProjectWidgetDialogComponent, {
        minWidth: 700,
        data: {projectWidget: projectWidget}
      });
    }
  }

  /**
   * Update the project widget position for every widgets
   *
   * @param {NgGridItemEvent[]} gridItemEvents The list of grid item events
   */
  updateProjectWidgetsPosition(gridItemEvents: NgGridItemEvent[]) {
    const currentProject: Project = this.dashboardService.currendDashbordSubject.getValue();

    // update the position only if the grid item has been init
    if (this.isGridItemInit) {
      const projectWidgetPositions: ProjectWidgetPosition[] = [];

      gridItemEvents.forEach(gridItemEvent => {
        const projectWidgetPosition: ProjectWidgetPosition = {
          projectWidgetId: gridItemEvent.payload,
          col: gridItemEvent.col,
          row: gridItemEvent.row,
          width: gridItemEvent.sizex,
          height: gridItemEvent.sizey
        };

        projectWidgetPositions.push(projectWidgetPosition);
      });

      this.dashboardService
          .updateWidgetPositionForProject(currentProject.id, projectWidgetPositions)
          .subscribe();
    }

    // We check if the grid item is init, if it's we change the boolean.
    // Without this the grid item plugin will send request to the server at the initialisation of the component
    // (probably a bug of the "OnItemChange" event)
    if (!this.isGridItemInit && gridItemEvents.length === currentProject.projectWidgets.length) {
      this.isGridItemInit = true;
    }
  }

}
