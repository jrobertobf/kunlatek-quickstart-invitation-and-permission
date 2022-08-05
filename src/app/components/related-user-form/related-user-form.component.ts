import { Component, ElementRef, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormGroupDirective,
  FormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MyPerformance } from "src/app/utils/performance";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { MatChipInputEvent } from "@angular/material/chips";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { MyErrorHandler } from "../../utils/error-handler";
import { RelatedUserFormService } from "./related-user-form.service";

@Component({
  selector: "app-related-user-form",
  templateUrl: "./related-user-form.component.html",
  styleUrls: ["./related-user-form.component.scss"],
})
export class RelatedUserFormComponent {
  relatedUserFormId: string = "";
  relatedUserFormForm: FormGroup;
  relatedUserFormToEdit: any;
  isAddModule: boolean = true;
  isLoading: boolean = false;

  filteredPermissionGroupId: Array<any> = [];

  permissionGroupIdSeparatorKeysCodes: number[] = [ENTER, COMMA];
  chosenPermissionGroupIdView: string[] = [];
  chosenPermissionGroupIdValue: string[] = [];

  @ViewChild("permissionGroupIdInput") permissionGroupIdInput!: ElementRef<
    HTMLInputElement
  >;
  relatedUserFormBuilder = {
    email: [
      {
        value: null,
        disabled: true,
      },
      [Validators.email, Validators.required],
    ],

    name: [
      {
        value: null,
        disabled: true,
      },
      [Validators.required],
    ],

    uniqueId: [
      {
        value: null,
        disabled: true,
      },
      [Validators.required],
    ],

    businessName: [
      {
        value: null,
        disabled: true,
      },
      [Validators.required],
    ],

    permissionGroupId: [[], []],
  };

  constructor(
    private _formBuilder: FormBuilder,
    private _activatedRoute: ActivatedRoute,
    private _router: Router,
    private _snackbar: MatSnackBar,
    private _relatedUserFormService: RelatedUserFormService,
    private _errorHandler: MyErrorHandler
  ) {
    try {
      this._activatedRoute.params.subscribe(async (routeParams) => {
        this.relatedUserFormId = routeParams["id"];
        this.isAddModule = !this.relatedUserFormId;

        if (this.relatedUserFormId) {
          this.relatedUserFormToEdit = await this._relatedUserFormService.find(
            this.relatedUserFormId
          );
          this.relatedUserFormForm.patchValue(this.relatedUserFormToEdit.data);

          if (this.relatedUserFormToEdit.data.permissionGroup) {
            this.chosenPermissionGroupIdView = [];
            this.chosenPermissionGroupIdValue = [];
            this.relatedUserFormToEdit.data.permissionGroup.forEach((element: any) => {
                this.chosenPermissionGroupIdView.push(element.name);
                this.chosenPermissionGroupIdValue.push(element._id);
              });
          }
        }
        this.checkOptionsCreation([], 0);
      });
    } catch (error: any) {
      const message = this._errorHandler.apiErrorMessage(error.error.message);
      this.sendErrorMessage(message);
    }

    this.relatedUserFormForm = this._formBuilder.group(
      this.relatedUserFormBuilder
    );
  }

  addPermissionGroupId(event: MatChipInputEvent): void {
    const value = (event.value || "").trim();

    if (value) {
      this.chosenPermissionGroupIdView.push(value);
    }
    event.chipInput!.clear();
    this.relatedUserFormForm.get("permissionGroupId")?.setValue(null);
  }
  removePermissionGroupId(element: string): void {
    const index = this.chosenPermissionGroupIdView.indexOf(element);

    if (index >= 0) {
      this.chosenPermissionGroupIdView.splice(index, 1);
      this.chosenPermissionGroupIdValue.splice(index, 1);
      this.relatedUserFormForm
        .get("permissionGroupId")
        ?.setValue(this.chosenPermissionGroupIdValue);
    }
  }

  selectedPermissionGroupId(event: MatAutocompleteSelectedEvent): void {
    this.chosenPermissionGroupIdView.push(event.option.viewValue);
    this.chosenPermissionGroupIdValue.push(event.option.value);
    this.permissionGroupIdInput.nativeElement.value = "";
    this.relatedUserFormForm
      .get("permissionGroupId")
      ?.setValue(this.chosenPermissionGroupIdValue);
  }

  displayFnToPermissionGroupId = (value?: any) => {
    const otherValue = this.relatedUserFormToEdit?.data?.__permissionGroup
      ? this.relatedUserFormToEdit.data.__permissionGroup
      : null;
    if (value === otherValue?._id) {
      return otherValue.name;
    }
    return value
      ? this.filteredPermissionGroupId.find((_) => _._id === value)?.name
      : null;
  };
  setFilteredPermissionGroupId = async () => {
    try {
      const paramsToFilter = ["name"];
      if (this.relatedUserFormForm.value.permissionGroupId.length > 0) {
        const filter = `?filter={"or":[${paramsToFilter.map(
          (element: string) => {
            if (element !== "undefined") {
              return `{"${element}":{"like": "${this.relatedUserFormForm.value.permissionGroupId}", "options": "i"}}`;
            }
            return "";
          }
        )}]}`;

        this._relatedUserFormService
          .permissionGroupIdSelectObjectGetAll(filter.replace("},]", "}]"))
          .then((result: any) => {
            this.filteredPermissionGroupId = result.data.result;
            this.isLoading = false;
          })
          .catch(async (err) => {
            if (err.error.logMessage === "jwt expired") {
              await this.refreshToken();
              this.setFilteredPermissionGroupId();
            } else {
              const message = this._errorHandler.apiErrorMessage(
                err.error.message
              );
              this.sendErrorMessage(message);
            }
          });
      }
    } catch (error: any) {
      const message = this._errorHandler.apiErrorMessage(error.error.message);
      this.sendErrorMessage(message);
    }
  };
  callSetFilteredPermissionGroupId = MyPerformance.debounce(() =>
    this.setFilteredPermissionGroupId()
  );

  relatedUserFormSubmit = async (
    relatedUserFormDirective: FormGroupDirective
  ) => {
    this.isLoading = true;

    try {
      if (this.isAddModule) {
        await this._relatedUserFormService.save(this.relatedUserFormForm.value);
      }

      if (!this.isAddModule) {
        await this._relatedUserFormService.update(
          this.relatedUserFormForm.value,
          this.relatedUserFormId
        );
      }
      this.redirectTo("main/related-user");

      this.isLoading = false;
    } catch (error: any) {
      if (error.error.logMessage === "jwt expired") {
        await this.refreshToken();
        this.relatedUserFormSubmit(relatedUserFormDirective);
      } else {
        const message = this._errorHandler.apiErrorMessage(error.error.message);
        this.isLoading = false;
        this.sendErrorMessage(message);
      }
    }

    this.relatedUserFormForm.reset();
    relatedUserFormDirective.resetForm();
  };
  refreshToken = async () => {
    try {
      const res: any = await this._relatedUserFormService.refreshToken();
      if (res) {
        sessionStorage.setItem("token", res?.data.authToken);
        sessionStorage.setItem("refreshToken", res?.data.authRefreshToken);
      }
    } catch (error: any) {
      const message = this._errorHandler.apiErrorMessage(error.error.message);
      this.isLoading = false;
      this.sendErrorMessage(message);
      sessionStorage.clear();
      this._router.navigate(["/"]);
    }
  };
  redirectTo = (uri: string) => {
    this._router
      .navigateByUrl("/main", { skipLocationChange: true })
      .then(() => {
        this._router.navigate([uri]);
      });
  };
  checkOptionsCreation = async (functions: Array<Function>, index: number) => {
    const newIndex = index + 1;

    if (newIndex <= functions.length) {
      await functions[index].call(null);
      this.checkOptionsCreation(functions, newIndex);
    } else {
      this.isLoading = false;
    }
  };
  sendErrorMessage = (errorMessage: string) => {
    this._snackbar.open(errorMessage, undefined, {
      duration: 4 * 1000,
    });
  };
}
