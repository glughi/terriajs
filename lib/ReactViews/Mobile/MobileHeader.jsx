import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import SearchBox from "../Search/SearchBox.jsx";
import ObserveModelMixin from "../ObserveModelMixin";
import MobileModalWindow from "./MobileModalWindow";
import Branding from "../SidePanel/Branding.jsx";
import Styles from "./mobile-header.scss";
import Icon from "../Icon.jsx";
import MobileMenu from "./MobileMenu";
import classNames from "classnames";
import { removeMarker } from "../../Models/LocationMarkerUtils";
import { withTranslation } from "react-i18next";

import ViewerMode from "../../Models/ViewerMode";


const MobileHeader = createReactClass({
  displayName: "MobileHeader",
  mixins: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object,
    viewState: PropTypes.object.isRequired,
    allBaseMaps: PropTypes.array,
    version: PropTypes.string,
    menuItems: PropTypes.array,
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    return {};
  },

  showSearch() {
    const viewState = this.props.viewState;
    const mobileView = viewState.mobileView;
    const mobileViewOptions = viewState.mobileViewOptions;
    const searchState = viewState.searchState;
    if (
      mobileView === mobileViewOptions.data ||
      mobileView === mobileViewOptions.preview
    ) {
      searchState.showMobileCatalogSearch = true;
    } else {
      searchState.showMobileLocationSearch = true;
      this.showLocationSearchResults();
    }
  },

  closeLocationSearch() {
    this.props.viewState.searchState.showMobileLocationSearch = false;
    this.props.viewState.explorerPanelIsVisible = false;
    this.props.viewState.switchMobileView(null);
  },

  closeCatalogSearch() {
    this.props.viewState.searchState.showMobileCatalogSearch = false;
    this.props.viewState.searchState.catalogSearchText = "";
  },

  onMobileDataCatalogClicked() {
    this.toggleView(this.props.viewState.mobileViewOptions.data);
  },

  onMobileSwitchViewClicked() {
    let newViewerMode;

    if(this.props.terria.viewerMode === ViewerMode.Leaflet)
      newViewerMode = ViewerMode.CesiumTerrain;
    else
      newViewerMode = ViewerMode.Leaflet;

    this.props.terria.viewerMode = newViewerMode;

    // We store the user's chosen viewer mode for future use.
    this.props.terria.setLocalProperty("viewermode", newViewerMode);
    this.props.terria.currentViewer.notifyRepaintRequired();
  },

  onMobileAddDataCatalogClicked() {
    this.toggleView(this.props.viewState.mobileViewOptions.addData);
  },

  onMobileNowViewingClicked() {
    this.toggleView(this.props.viewState.mobileViewOptions.nowViewing);
  },

  onMobileElevationChartClicked() {
    this.toggleView(this.props.viewState.mobileViewOptions.elevationChart);
  },

  changeLocationSearchText(newText) {
    this.props.viewState.searchState.locationSearchText = newText;

    if (newText.length === 0) {
      removeMarker(this.props.terria);
    }

    this.showLocationSearchResults();
  },

  showLocationSearchResults() {
    const text = this.props.viewState.searchState.locationSearchText;
    if (text && text.length > 0) {
      this.props.viewState.explorerPanelIsVisible = true;
      this.props.viewState.mobileView = this.props.viewState.mobileViewOptions.locationSearchResults;
    } else {
      // TODO: return to the preview mobileView, rather than dropping back to the map
      this.props.viewState.explorerPanelIsVisible = false;
      this.props.viewState.mobileView = null;
    }
  },

  changeCatalogSearchText(newText) {
    this.props.viewState.searchState.catalogSearchText = newText;
  },

  searchLocations() {
    this.props.viewState.searchState.searchLocations();
  },

  searchCatalog() {
    this.props.viewState.searchState.searchCatalog();
  },

  toggleView(viewname) {
    if (this.props.viewState.mobileView !== viewname) {
      this.props.viewState.explorerPanelIsVisible = true;
      this.props.viewState.switchMobileView(viewname);
    } else {
      this.props.viewState.explorerPanelIsVisible = false;
      this.props.viewState.switchMobileView(null);
    }
  },

  onClickFeedback(e) {
    e.preventDefault();
    this.props.viewState.feedbackFormIsVisible = true;
    this.setState({
      menuIsOpen: false
    });
  },

  render() {
    const searchState = this.props.viewState.searchState;
    const nowViewingLength = this.props.terria.nowViewing.items.length;
    const { t } = this.props;

    const txtView = this.props.terria.viewerMode === ViewerMode.Leaflet ? " 3D" : " 2D";

    return (
      <div className={Styles.ui}>
        <div className={Styles.mobileHeader}>
          <Choose>
            <When
              condition={
                !searchState.showMobileLocationSearch &&
                !searchState.showMobileCatalogSearch
              }
            >
              <div className={Styles.groupLeft}>
                <button
                  type="button"
                  onClick={() =>
                    (this.props.viewState.mobileMenuVisible = true)
                  }
                  className={Styles.btnMenu}
                  title={t("mobile.toggleNavigation")}
                >
                  <Icon glyph={Icon.GLYPHS.menu} />
                </button>
                <Branding
                  terria={this.props.terria}
                  version={this.props.version}
                />
              </div>
              <div className={Styles.groupRight}>
                <If condition={this.props.terria.elevationPoints}>
                  <button
                    type="button"
                    className={Styles.btnAdd}
                    onClick={this.onMobileElevationChartClicked}  
                  >
                    <Icon glyph={Icon.GLYPHS.lineChart} />
                  </button>
                </If>
                <button
                  type="button"
                  className={Styles.btnAdd}
                  onClick={this.onMobileSwitchViewClicked}>
                  {txtView}
                  <Icon glyph={Icon.GLYPHS.sphere} />
                </button>
                <button
                  type="button"
                  className={Styles.btnAdd}
                  onClick={this.onMobileDataCatalogClicked}
                >
                  {t("addData.addDataBtnText")}
                  <Icon glyph={Icon.GLYPHS.increase} />
                </button>
                <button
                  type="button"
                  className={Styles.btnAdd}
                  onClick={this.onMobileAddDataCatalogClicked}
                >
                  <Icon glyph={Icon.GLYPHS.upload} />
                </button>
                <If condition={nowViewingLength > 0}>
                  <button
                    type="button"
                    className={Styles.btnNowViewing}
                    onClick={this.onMobileNowViewingClicked}
                  >
                    <Icon glyph={Icon.GLYPHS.eye} />
                    <span
                      className={classNames(Styles.nowViewingCount, {
                        [Styles.doubleDigit]: nowViewingLength > 9
                      })}
                    >
                      {nowViewingLength}
                    </span>
                  </button>
                </If>
                <button
                  className={Styles.btnSearch}
                  type="button"
                  onClick={this.showSearch}
                >
                  <Icon glyph={Icon.GLYPHS.search} />
                </button>
              </div>
            </When>
            <Otherwise>
              <div className={Styles.formSearchData}>
                <Choose>
                  <When condition={searchState.showMobileLocationSearch}>
                    <SearchBox
                      searchText={searchState.locationSearchText}
                      onSearchTextChanged={this.changeLocationSearchText}
                      onDoSearch={this.searchLocations}
                      placeholder={t("search.placeholder")}
                      alwaysShowClear={true}
                      onClear={this.closeLocationSearch}
                      autoFocus={true}
                    />
                  </When>
                  <When condition={searchState.showMobileCatalogSearch}>
                    <SearchBox
                      searchText={searchState.catalogSearchText}
                      onSearchTextChanged={this.changeCatalogSearchText}
                      onDoSearch={this.searchCatalog}
                      placeholder={t("search.searchCatalogue")}
                      onClear={this.closeCatalogSearch}
                      autoFocus={true}
                    />
                  </When>
                </Choose>
              </div>
            </Otherwise>
          </Choose>
        </div>
        <MobileMenu
          menuItems={this.props.menuItems}
          viewState={this.props.viewState}
          allBaseMaps={this.props.allBaseMaps}
          terria={this.props.terria}
          showFeedback={!!this.props.terria.configParameters.feedbackUrl}
        />
        <MobileModalWindow
          terria={this.props.terria}
          viewState={this.props.viewState}
        />
      </div>
    );
  }
});
module.exports = withTranslation()(MobileHeader);
