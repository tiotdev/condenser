/* eslint react/prop-types: 0 */
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import tt from 'counterpart';
import { List } from 'immutable';
import TransactionError from 'app/components/elements/TransactionError';
import TimeAgoWrapper from 'app/components/elements/TimeAgoWrapper';
import {
    numberWithCommas,
    vestingSteem,
    delegatedSteem,
    pricePerSteem,
} from 'app/utils/StateFunctions';
import shouldComponentUpdate from 'app/utils/shouldComponentUpdate';
import Tooltip from 'app/components/elements/Tooltip';
import { FormattedHTMLMessage } from 'app/Translator';
import {
    LIQUID_TOKEN,
    LIQUID_TICKER,
    DEBT_TOKENS,
    VESTING_TOKEN,
} from 'app/client_config';
import * as transactionActions from 'app/redux/TransactionReducer';
import * as globalActions from 'app/redux/GlobalReducer';
import DropdownMenu from 'app/components/elements/DropdownMenu';

const assetPrecision = 1000;

class UserWallet extends React.Component {
    constructor() {
        super();
        this.state = {
            claimInProgress: false,
        };
        this.shouldComponentUpdate = shouldComponentUpdate(this, 'UserWallet');
    }

    handleClaimRewards = account => {
        this.setState({ claimInProgress: true }); // disable the claim button
        this.props.claimRewards(account);
    };

    render() {
        const { price_per_steem, account, current_user } = this.props;
        const gprops = this.props.gprops.toJS();

        // do not render if account is not loaded or available
        if (!account) return null;

        // do not render if state appears to contain only lite account info
        if (!account.has('vesting_shares')) return null;

        let vesting_steem = vestingSteem(account.toJS(), gprops);
        let delegated_steem = delegatedSteem(account.toJS(), gprops);

        let isMyAccount =
            current_user &&
            current_user.get('username') === account.get('name');

        const showTransfer = (asset, transferType, e) => {
            e.preventDefault();
            this.props.showTransfer({
                to: isMyAccount ? null : account.get('name'),
                asset,
                transferType,
            });
        };

        const balance_steem = parseFloat(account.get('balance').split(' ')[0]);
        const sbd_balance = parseFloat(account.get('sbd_balance'));

        // set displayed estimated value
        let total_value =
            '$' +
            numberWithCommas(
                (
                    (vesting_steem + balance_steem) * price_per_steem +
                    sbd_balance
                ).toFixed(2)
            );

        // format spacing on estimated value based on account state
        let estimate_output = <p>{total_value}</p>;
        if (isMyAccount) {
            estimate_output = <p>{total_value}&nbsp; &nbsp; &nbsp;</p>;
        }

        let steem_menu = [
            {
                value: tt('userwallet_jsx.transfer'),
                link: '#',
                onClick: showTransfer.bind(this, 'STEEM', 'Transfer'),
            },
        ];
        let dollar_menu = [
            {
                value: tt('g.transfer'),
                link: '#',
                onClick: showTransfer.bind(this, 'SBD', 'Transfer'),
            },
        ];

        const steem_balance_str = numberWithCommas(balance_steem.toFixed(3));
        const power_balance_str = numberWithCommas(vesting_steem.toFixed(3));
        const received_power_balance_str =
            (delegated_steem < 0 ? '+' : '') +
            numberWithCommas((-delegated_steem).toFixed(3));
        const sbd_balance_str = numberWithCommas('$' + sbd_balance.toFixed(3)); // formatDecimal(account.sbd_balance, 3)

        // set dynamic secondary wallet values
        const sbdInterest = this.props.sbd_interest / 100;
        const sbdMessage = (
            <span>{tt('userwallet_jsx.tradeable_tokens_transferred')}</span>
        );

        const reward_steem =
            parseFloat(account.get('reward_steem_balance').split(' ')[0]) > 0
                ? account.get('reward_steem_balance')
                : null;
        const reward_sbd =
            parseFloat(account.get('reward_sbd_balance').split(' ')[0]) > 0
                ? account.get('reward_sbd_balance')
                : null;
        const reward_sp =
            parseFloat(account.get('reward_vesting_steem').split(' ')[0]) > 0
                ? account.get('reward_vesting_steem').replace('STEEM', 'SP')
                : null;

        let rewards = [];
        if (reward_steem) rewards.push(reward_steem);
        if (reward_sbd) rewards.push(reward_sbd);
        if (reward_sp) rewards.push(reward_sp);

        let rewards_str;
        switch (rewards.length) {
            case 3:
                rewards_str = `${rewards[0]}, ${rewards[1]} and ${rewards[2]}`;
                break;
            case 2:
                rewards_str = `${rewards[0]} and ${rewards[1]}`;
                break;
            case 1:
                rewards_str = `${rewards[0]}`;
                break;
        }

        let claimbox;
        if (current_user && rewards_str && isMyAccount) {
            claimbox = (
                <div className="row">
                    <div className="columns small-12">
                        <div className="UserWallet__claimbox">
                            <span className="UserWallet__claimbox-text">
                                Your current rewards: {rewards_str}
                            </span>
                            <button
                                disabled={this.state.claimInProgress}
                                className="button"
                                onClick={e => {
                                    this.handleClaimRewards(account);
                                }}
                            >
                                {tt('userwallet_jsx.redeem_rewards')}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="UserWallet">
                {claimbox}
                <div className="row">
                    <div className="columns small-10 medium-12 medium-expand">
                        <div>
                            <br />
                            <h4>{tt('g.balances')}</h4>
                            <br />
                        </div>
                    </div>
                </div>
                <div className="UserWallet__balance row">
                    <div className="column small-12 medium-8">
                        STEEM
                        <FormattedHTMLMessage
                            className="secondary"
                            id="tips_js.liquid_token"
                            params={{ LIQUID_TOKEN, VESTING_TOKEN }}
                        />
                    </div>
                    <div className="column small-12 medium-4">
                        {isMyAccount ? (
                            <DropdownMenu
                                className="Wallet_dropdown"
                                items={steem_menu}
                                el="li"
                                selected={steem_balance_str + ' STEEM'}
                            />
                        ) : (
                            steem_balance_str + ' STEEM'
                        )}
                    </div>
                </div>
                <div className="UserWallet__balance row zebra">
                    <div className="column small-12 medium-8">
                        STEEM POWER
                        <FormattedHTMLMessage
                            className="secondary"
                            id="tips_js.influence_token"
                        />
                        {delegated_steem != 0 ? (
                            <span className="secondary">
                                {tt(
                                    'tips_js.part_of_your_steem_power_is_currently_delegated',
                                    { user_name: account.get('name') }
                                )}
                            </span>
                        ) : null}
                    </div>
                    <div className="column small-12 medium-4">
                        {power_balance_str + ' STEEM'}
                        {delegated_steem != 0 ? (
                            <div>
                                <Tooltip t="STEEM POWER delegated to/from this account">
                                    ({received_power_balance_str} STEEM)
                                </Tooltip>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="UserWallet__balance row">
                    <div className="column small-12 medium-8">
                        STEEM DOLLARS
                        <div className="secondary">{sbdMessage}</div>
                    </div>
                    <div className="column small-12 medium-4">
                        {isMyAccount ? (
                            <DropdownMenu
                                className="Wallet_dropdown"
                                items={dollar_menu}
                                el="li"
                                selected={sbd_balance_str}
                            />
                        ) : (
                            sbd_balance_str
                        )}
                    </div>
                </div>
                <div className="UserWallet__balance row">
                    <div className="column small-12 medium-8">
                        {tt('userwallet_jsx.estimated_account_value')}
                        <div className="secondary">
                            {tt('tips_js.estimated_value', { LIQUID_TOKEN })}
                        </div>
                    </div>
                    <div className="column small-12 medium-4">
                        {estimate_output}
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const price_per_steem = pricePerSteem(state);
        const gprops = state.global.get('props');
        const sbd_interest = gprops.get('sbd_interest_rate');
        return {
            ...ownProps,
            price_per_steem,
            sbd_interest,
            gprops,
        };
    },
    // mapDispatchToProps
    dispatch => ({
        claimRewards: account => {
            const username = account.get('name');
            const successCallback = () => {
                dispatch(
                    globalActions.getState({ url: `@${username}/transfers` })
                );
            };

            const operation = {
                account: username,
                reward_steem: account.get('reward_steem_balance'),
                reward_sbd: account.get('reward_sbd_balance'),
                reward_vests: account.get('reward_vesting_balance'),
            };

            dispatch(
                transactionActions.broadcastOperation({
                    type: 'claim_reward_balance',
                    operation,
                    successCallback,
                })
            );
        },
    })
)(UserWallet);
