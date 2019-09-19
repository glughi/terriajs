"use strict";

import classNames from "classnames";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import React from "react";
import defined from "terriajs-cesium/Source/Core/defined";
import printWindow from "../../../../Core/printWindow";
import Clipboard from "../../../Clipboard";
import Icon from "../../../Icon.jsx";
import Loader from "../../../Loader";
import ObserverModelMixin from "../../../ObserveModelMixin";
import MenuPanel from "../../../StandardUserInterface/customizable/MenuPanel.jsx";
import Input from "../../../Styled/Input/Input.jsx";
import DropdownStyles from "../panel.scss";
import {
  addUserAddedCatalog,
  buildShareLink,
  buildShortShareLink,
  canShorten
} from "./BuildShareLink";
import PrintView from "./PrintView";
import Styles from "./share-panel.scss";

import fileDialog from './file-dialog.min.js'

var TerriaError = require('../../../../Core/TerriaError');

const SharePanel = createReactClass({
  displayName: "SharePanel",
  mixins: [ObserverModelMixin],

  propTypes: {
    terria: PropTypes.object,
    userPropWhiteList: PropTypes.array,
    advancedIsOpen: PropTypes.bool,
    shortenUrls: PropTypes.bool,
    catalogShare: PropTypes.bool,
    catalogShareWithoutText: PropTypes.bool,
    modalWidth: PropTypes.number,
    viewState: PropTypes.object.isRequired,
    rejected: PropTypes.string
  },

  getDefaultProps() {
    return {
      advancedIsOpen: false,
      shortenUrls: false,
      rejected: ""
    };
  },

  getInitialState() {
    return {
      isOpen: false,
      shortenUrls:
        this.props.shortenUrls &&
        this.props.terria.getLocalProperty("shortenShareUrls"),
      shareUrl: "",
      creatingPrintView: false,
      creatingDownload: false
    };
  },

  componentDidMount() {
    if (this.props.terria.configParameters.interceptBrowserPrint) {
      window.addEventListener("beforeprint", this.beforeBrowserPrint, false);
      window.addEventListener("afterprint", this.afterBrowserPrint, false);

      const handlePrintMediaChange = evt => {
        if (evt.matches) {
          this.beforeBrowserPrint();
        } else {
          this.afterBrowserPrint();
        }
      };

      if (window.matchMedia) {
        const matcher = window.matchMedia("print");
        matcher.addListener(handlePrintMediaChange);
        this._unsubscribeFromPrintMediaChange = function() {
          matcher.removeListener(handlePrintMediaChange);
        };
      }

      this._oldPrint = window.print;
      window.print = () => {
        this.print();
      };
    }
  },

  componentWillUnmount() {
    window.removeEventListener("beforeprint", this.beforeBrowserPrint, false);
    window.removeEventListener("afterprint", this.afterBrowserPrint, false);
    if (this._unsubscribeFromPrintMediaChange) {
      this._unsubscribeFromPrintMediaChange();
    }

    if (this._oldPrint) {
      window.print = this._oldPrint;
    }
  },

  beforeBrowserPrint() {
    this.afterBrowserPrint();
    this._message = document.createElement("div");
    this._message.innerText =
      "For better printed results, please use " +
      this.props.terria.appName +
      "'s Print button instead of your web browser's print feature.";
    window.document.body.insertBefore(
      this._message,
      window.document.body.childNodes[0]
    );
  },

  afterBrowserPrint() {
    if (this._message) {
      window.document.body.removeChild(this._message);
      this._message = undefined;
    }
    this.changeOpenState(true);
  },

  advancedIsOpen() {
    return this.state.advancedIsOpen;
  },

  toggleAdvancedOptions(e) {
    this.setState(prevState => ({
      advancedIsOpen: !prevState.advancedIsOpen
    }));
  },

  updateForShortening() {
    this.setState({
      shareUrl: ""
    });

    if (this.shouldShorten()) {
      this.setState({
        placeholder: "Abbreviando..."
      });

      buildShortShareLink(this.props.terria, this.props.viewState)
        .then(shareUrl => this.setState({ shareUrl }))
        .otherwise(() => {
          this.setUnshortenedUrl();
          this.setState({
            errorMessage:
              "An error occurred while attempting to shorten the URL.  Please check your internet connection and try again."
          });
        });
    } else {
      this.setUnshortenedUrl();
    }
  },

  setUnshortenedUrl() {
    this.setState({
      shareUrl: buildShareLink(this.props.terria, this.props.viewState)
    });
  },

  isUrlShortenable() {
    return canShorten(this.props.terria);
  },

  shouldShorten() {
    const localStoragePref = this.props.terria.getLocalProperty(
      "shortenShareUrls"
    );

    return (
      this.isUrlShortenable() &&
      (localStoragePref || !defined(localStoragePref))
    );
  },

  onShortenClicked(e) {
    if (this.shouldShorten()) {
      this.props.terria.setLocalProperty("shortenShareUrls", false);
    } else if (this.isUrlShortenable()) {
      this.props.terria.setLocalProperty("shortenShareUrls", true);
    } else {
      return;
    }

    this.updateForShortening();
    this.forceUpdate();
  },

  changeOpenState(open) {
    this.setState({
      isOpen: open
    });

    if (open) {
      this.updateForShortening();
      if (this.props.catalogShare) {
        this.props.viewState.shareModalIsVisible = true;
      }
    }
  },

  print() {
    this.createPrintView(true, true);
  },

  showPrintView() {
    this.createPrintView(false, false);
  },

  createPrintView(hidden, printAutomatically) {
    this.setState({
      creatingPrintView: true
    });

    let iframe;
    if (hidden) {
      iframe = document.createElement("iframe");
      document.body.appendChild(iframe);
    }

    PrintView.create({
      terria: this.props.terria,
      viewState: this.props.viewState,
      printWindow: iframe ? iframe.contentWindow : undefined,
      readyCallback: windowToPrint => {
        if (printAutomatically) {
          printWindow(windowToPrint)
            .otherwise(e => {
              this.props.terria.error.raiseEvent(e);
            })
            .always(() => {
              if (iframe) {
                document.body.removeChild(iframe);
              }
              if (hidden) {
                this.setState({
                  creatingPrintView: false
                });
              }
            });
        }
      },
      closeCallback: windowToPrint => {
        if (hidden) {
          this.setState({
            creatingPrintView: false
          });
        }
      }
    });

    if (!hidden) {
      this.setState({
        creatingPrintView: false
      });
    }
  },

  getShareUrlInput(theme) {
    return (
      <Input
        className={Styles.shareUrlfield}
        light={theme === "light"}
        dark={theme === "dark"}
        large
        type="text"
        value={this.state.shareUrl}
        placeholder={this.state.placeholder}
        readOnly
        onClick={e => e.target.select()}
        id="share-url"
      />
    );
  },

  onAddWebDataClicked() {
    this.setState({
      isOpen: false
    });
    this.props.viewState.openUserData();
  },

  renderWarning() {
    // Generate share data for user added catalog, then throw that away and use the returned
    //  "rejected" items to display a disclaimer about what can't be shared
    const unshareableItems = addUserAddedCatalog(this.props.terria, []);
    return (
      <If condition={unshareableItems.length > 0}>
        <div className={Styles.warning}>
          <p className={Styles.paragraph}>
            <strong>Note:</strong>
          </p>
          <p className={Styles.paragraph}>
            The following data sources will NOT be shared because they include
            data from this local system. To share these data sources, publish
            their data on a web server and{" "}
            <a
              className={Styles.warningLink}
              onClick={this.onAddWebDataClicked}
            >
              add them using a url
            </a>
            .
          </p>
          <ul className={Styles.paragraph}>
            {unshareableItems.map((item, i) => {
              return (
                <li key={i}>
                  <strong>{item.name}</strong>
                </li>
              );
            })}
          </ul>
        </div>
      </If>
    );
  },

  /* Function to load map config from a file */
  loadMapFromFile() {
    fileDialog({ multiple: false, accept: '.geo3d' })
    .then(file => {
      if (file.length == 1) {
        var reader = new FileReader();
        reader.onload = (function (e) { window.open(e.target.result, "_self"); });
        reader.readAsText(file[0]);
      }
    })
  },

  saveMapUrlOnFile() {
    const obj = buildShareLink(this.props.terria, true);
    
    if(obj['rejected'] != ""){
      // Local layer path are unknown.
      this.props.terria.error.raiseEvent(new TerriaError({
        title: 'Layer locali non salvati',
        message: 'I seguenti layer locali non possono essere salvati per motivi di sicurezza: ' + obj['rejected']
      }));
    }
  },

  renderContent() {
    if (this.props.catalogShare) {
      return this.renderContentForCatalogShare();
    } else {
      return this.renderContentWithPrintAndEmbed();
    }
  },

  renderContentForCatalogShare() {
    return (
      <Choose>
        <When condition={this.state.shareUrl === ""}>
          <Loader message="Generazione in corso..." />
        </When>
        <Otherwise>
          <div className={Styles.clipboardForCatalogShare}>
            <Clipboard
              theme="light"
              text={this.state.shareUrl}
              source={this.getShareUrlInput("light")}
              id="share-url"
            />
            {this.renderWarning()}
          </div>
        </Otherwise>
      </Choose>
    );
  },

  renderContentWithPrintAndEmbed() {
    const iframeCode = this.state.shareUrl.length
      ? `<iframe style="width: 720px; height: 600px; border: none;" src="${
          this.state.shareUrl
        }" allowFullScreen mozAllowFullScreen webkitAllowFullScreen></iframe>`
      : "";

    return (
      <div>
        <div className={DropdownStyles.section}>
          <Clipboard source={this.getShareUrlInput("dark")} id="share-url" />
          {this.renderWarning()}
        </div>
        <div className={DropdownStyles.section}>
          <div>Stampa mappa</div>
          <div className={Styles.explanation}>
            Apri una versione stampabile della mappa.
          </div>
          <div>
            <button
              className={Styles.printButton}
              onClick={this.print}
              disabled={this.state.creatingPrintView}
            >
              Stampa
            </button>
            <button
              className={Styles.printButton}
              onClick={this.showPrintView}
              disabled={this.state.creatingPrintView}
            >
              Salva come pagina HTML
            </button>
            <div className={Styles.printViewLoader}>
              {this.state.creatingPrintView && (
                <Loader message="Creazione in corso..." />
              )}
            </div>
          </div>
        </div>
        <div className={DropdownStyles.section}></div>
        <div>Salva/Carica Mappa</div>
        <div className={Styles.explanation}>Salva o carica una mappa su file.</div>
        <div>
            {/* Added feature to save map screenshot on disk */}
            {/*<div className={DropdownStyles.section}>
                <a className={Styles.button} href={this.state.imageUrl} download="screenshot_mappa.jpg">Salva screenshot mappa</a>
            </div>*/}
            {/* Added feature to save shareUrl to file on disk so it can be loaded later */}
            <div>
                <a className={Styles.printButton} onClick={this.saveMapUrlOnFile} href={"data:text/plain;charset=utf-8," + this.state.shareUrl} download="mappa.geo3d">Salva mappa corrente</a>
                <button className={Styles.printButton} onClick={this.loadMapFromFile}>Carica mappa da file</button>
            </div>
        </div>
        <div></div>
        <div className={classNames(DropdownStyles.section, Styles.shortenUrl)}>
          <div className={Styles.btnWrapper}>
            <button
              type="button"
              onClick={this.toggleAdvancedOptions}
              className={Styles.btnAdvanced}
            >
              <span>Opzioni avanzate</span>
              {this.advancedIsOpen() ? (
                <Icon glyph={Icon.GLYPHS.opened} />
              ) : (
                <Icon glyph={Icon.GLYPHS.closed} />
              )}
            </button>
          </div>
          <If condition={this.advancedIsOpen()}>
            <div className={DropdownStyles.section}>
              <p className={Styles.paragraph}>
                Codice per includere la mappa in una pagina HTML:
              </p>
              <Input
                large
                dark
                className={Styles.field}
                type="text"
                readOnly
                placeholder={this.state.placeholder}
                value={iframeCode}
                onClick={e => e.target.select()}
              />
            </div>
            <If condition={this.isUrlShortenable()}>
              <div
                className={classNames(
                  DropdownStyles.section,
                  Styles.shortenUrl
                )}
              >
                <button onClick={this.onShortenClicked}>
                  {this.shouldShorten() ? (
                    <Icon glyph={Icon.GLYPHS.checkboxOn} />
                  ) : (
                    <Icon glyph={Icon.GLYPHS.checkboxOff} />
                  )}
                  Abbrevia l'URL da condividere
                </button>
              </div>
            </If>
          </If>
        </div>
      </div>
    );
  },

  renderDownloadFormatButton(format) {
    return (
      <button
        key={format.name}
        className={Styles.formatButton}
        onClick={this.download}
        disabled={this.state.creatingDownload}
      >
        {format.name}
      </button>
    );
  },

  render() {
    const { catalogShare, catalogShareWithoutText, modalWidth } = this.props;
    const dropdownTheme = {
      btn: classNames({
        [Styles.btnCatalogShare]: catalogShare,
        [Styles.btnWithoutText]: catalogShareWithoutText
      }),
      outer: classNames(Styles.sharePanel, {
        [Styles.catalogShare]: catalogShare
      }),
      inner: classNames(Styles.dropdownInner, {
        [Styles.catalogShareInner]: catalogShare
      }),
      icon: "share"
    };

    const btnText = catalogShare ? "Condividi" : "Condividi e stampa";
    const btnTitle = catalogShare
      ? "Condividi il catalogo"
      : "Condividi la mappa";

    return (
      <div>
        <MenuPanel
          theme={dropdownTheme}
          btnText={catalogShareWithoutText ? null : btnText}
          viewState={this.props.viewState}
          btnTitle={btnTitle}
          isOpen={this.state.isOpen}
          onOpenChanged={this.changeOpenState}
          showDropdownAsModal={catalogShare}
          modalWidth={modalWidth}
          smallScreen={this.props.viewState.useSmallScreenInterface}
          onDismissed={() => {
            if (catalogShare) this.props.viewState.shareModalIsVisible = false;
          }}
        >
          <If condition={this.state.isOpen}>{this.renderContent()}</If>
        </MenuPanel>
      </div>
    );
  }
});

export default SharePanel;
