import { WritableSignal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject, of } from "rxjs";

import {
  DrawerDetails,
  DrawerType,
  ReportStatus,
  RiskInsightsDataService,
} from "@bitwarden/bit-common/dirt/reports/risk-insights";
import { createNewSummaryData } from "@bitwarden/bit-common/dirt/reports/risk-insights/helpers";
import { RiskInsightsEnrichedData } from "@bitwarden/bit-common/dirt/reports/risk-insights/models/report-data-service.types";
import { ReportState } from "@bitwarden/bit-common/dirt/reports/risk-insights/models/report-models";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { TableDataSource, ToastService } from "@bitwarden/components";

import { ApplicationTableDataSource } from "../shared/app-table-row-scrollable.component";

import { AllApplicationsComponent } from "./all-applications.component";

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Helper type to access protected members in tests
type ComponentWithProtectedMembers = AllApplicationsComponent & {
  dataSource: TableDataSource<ApplicationTableDataSource>;
  selectedUrls: WritableSignal<Set<string>>;
  markingAsCritical: WritableSignal<boolean>;
};

describe("AllApplicationsComponent", () => {
  let component: AllApplicationsComponent;
  let fixture: ComponentFixture<AllApplicationsComponent>;
  let mockI18nService: MockProxy<I18nService>;
  let mockToastService: MockProxy<ToastService>;
  let mockDataService: MockProxy<RiskInsightsDataService>;

  const reportStatus$ = new BehaviorSubject<ReportStatus>(ReportStatus.Complete);
  const enrichedReportData$ = new BehaviorSubject<RiskInsightsEnrichedData | null>(null);
  const drawerDetails$ = new BehaviorSubject<DrawerDetails>({
    open: false,
    invokerId: "",
    activeDrawerType: DrawerType.None,
    atRiskMemberDetails: [],
    appAtRiskMembers: null,
    atRiskAppDetails: null,
  });

  beforeEach(async () => {
    mockI18nService = mock<I18nService>();
    mockToastService = mock<ToastService>();
    mockDataService = mock<RiskInsightsDataService>();

    mockI18nService.t.mockImplementation((key: string) => key);

    Object.defineProperty(mockDataService, "reportStatus$", { get: () => reportStatus$ });
    Object.defineProperty(mockDataService, "enrichedReportData$", {
      get: () => enrichedReportData$,
    });
    Object.defineProperty(mockDataService, "drawerDetails$", { get: () => drawerDetails$ });

    await TestBed.configureTestingModule({
      imports: [AllApplicationsComponent, ReactiveFormsModule],
      providers: [
        { provide: I18nService, useValue: mockI18nService },
        { provide: ToastService, useValue: mockToastService },
        { provide: RiskInsightsDataService, useValue: mockDataService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AllApplicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("markAppsAsCritical", () => {
    beforeEach(() => {
      (component as ComponentWithProtectedMembers).selectedUrls.set(new Set(["GitHub", "Slack"]));
    });

    it("should show success toast when response has no error", async () => {
      mockDataService.saveCriticalApplications.mockReturnValue(
        of({
          status: ReportStatus.Complete,
          error: null,
          data: {
            summaryData: { ...createNewSummaryData(), totalCriticalApplicationCount: 2 },
          },
        } as ReportState),
      );

      await component.markAppsAsCritical();

      expect(mockToastService.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
      expect((component as ComponentWithProtectedMembers).selectedUrls().size).toBe(0);
      expect((component as ComponentWithProtectedMembers).markingAsCritical()).toBe(false);
    });

    it("should show error toast when response has error field set", async () => {
      mockDataService.saveCriticalApplications.mockReturnValue(
        of({
          status: ReportStatus.Complete,
          error: "Failed to save critical applications",
          data: null,
        }),
      );

      await component.markAppsAsCritical();

      expect(mockToastService.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
      // Selection preserved on error
      expect((component as ComponentWithProtectedMembers).selectedUrls().size).toBe(2);
      expect((component as ComponentWithProtectedMembers).markingAsCritical()).toBe(false);
    });
  });
});
