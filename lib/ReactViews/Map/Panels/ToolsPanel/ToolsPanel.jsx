'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import ObserverModelMixin from '../../../ObserveModelMixin';
import MenuPanel from '../../../StandardUserInterface/customizable/MenuPanel.jsx';
import CountDatasets from './CountDatasets';
import Styles from './tools-panel.scss';
import DropdownStyles from '../panel.scss';

const ToolsPanel = createReactClass({
    displayName: 'ToolsPanel',
    mixins: [ObserverModelMixin],

    propTypes: {
        terria: PropTypes.object,
        viewState: PropTypes.object.isRequired
    },

    getInitialState() {
        return {
            isOpen: false,
            resultsMessage: ''
        };
    },

    onOpenChanged(open) {
        this.setState({
            isOpen: open
        });
    },

    updateResults(results) {
      this.setState({
        resultsMessage: results
      });
    },

    render() {
        const dropdownTheme = {
            btn: Styles.btnShare,
            outer: Styles.ToolsPanel,
            inner: Styles.dropdownInner,
            icon: 'settings'
        };

        return (
            <MenuPanel theme={dropdownTheme}
                       btnText="Tool"
                       viewState={this.props.viewState}
                       btnTitle="Advanced toolbox"
                       onOpenChanged={this.onOpenChanged}
                       isOpen={this.state.isOpen}
                       smallScreen={this.props.viewState.useSmallScreenInterface}>
                <If condition={this.state.isOpen}>
                        <div className={DropdownStyles.section}>
                            <div className={Styles.this}>
                              <CountDatasets terria={this.props.terria} viewState={this.props.viewState} updateResults={this.updateResults}/>
                            </div>
                        </div>
                </If>
                <div className={Styles.results}>
                  <div dangerouslySetInnerHTML={{__html: this.state.resultsMessage}} />
                </div>
            </MenuPanel>
        );
    },
});

export default ToolsPanel;
