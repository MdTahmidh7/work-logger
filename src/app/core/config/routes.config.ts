import { Route } from '@angular/router';

export interface RouteConfig {
  path: string;
  title: string;
  icon: string;
}

export interface AppRoutes {
  routes: Route[];
}
