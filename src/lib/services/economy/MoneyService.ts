import { User } from '../../../models/User';
import { container } from '@sapphire/framework';
import type { Transaction } from '../../../models/User';

export class MoneyService {
  private static createTransaction(
    type: Transaction['type'],
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Transaction {
    return {
      type,
      amount,
      description,
      timestamp: new Date(),
      metadata
    };
  }

  static async addMoney(userId: string, amount: number, location: 'wallet' | 'bank' = 'wallet', reason: string = 'Unknown'): Promise<boolean> {
    try {
      if (amount <= 0) return false;

      const transaction = this.createTransaction('earn', amount, reason, { location });

      if (location === 'wallet') {
        const updatedUser = await User.findOneAndUpdate(
          { userId },
          {
            $inc: { 'economy.wallet': amount },
            $push: {
              'economy.transactions': {
                $each: [transaction],
                $slice: -100
              }
            }
          }
        );

        return !!updatedUser;
      }

      const updatedUser = await User.findOneAndUpdate(
        { userId },
        [
          {
            $set: {
              _availableBankSpace: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ['$economy.bankLimit', 10000] },
                      { $ifNull: ['$economy.bank', 0] }
                    ]
                  }
                ]
              }
            }
          },
          {
            $set: {
              _bankAmountToAdd: {
                $min: [amount, '$_availableBankSpace']
              }
            }
          },
          {
            $set: {
              _walletOverflow: {
                $subtract: [amount, '$_bankAmountToAdd']
              }
            }
          },
          {
            $set: {
              'economy.bank': {
                $add: [{ $ifNull: ['$economy.bank', 0] }, '$_bankAmountToAdd']
              },
              'economy.wallet': {
                $add: [{ $ifNull: ['$economy.wallet', 0] }, '$_walletOverflow']
              },
              'economy.transactions': {
                $slice: [
                  {
                    $concatArrays: [
                      { $ifNull: ['$economy.transactions', []] },
                      [transaction]
                    ]
                  },
                  -100
                ]
              }
            }
          },
          {
            $unset: ['_availableBankSpace', '_bankAmountToAdd', '_walletOverflow']
          }
        ]
      );

      return !!updatedUser;
    } catch (error) {
      container.logger.error('Error adding money:', error);
      return false;
    }
  }

  static async removeMoney(userId: string, amount: number, location: 'wallet' | 'bank' = 'wallet', reason: string = 'Unknown'): Promise<boolean> {
    try {
      if (amount <= 0) return false;

      const moneyPath = location === 'wallet' ? 'economy.wallet' : 'economy.bank';
      const transaction = this.createTransaction('spend', -amount, reason, { location });

      const updatedUser = await User.findOneAndUpdate(
        {
          userId,
          [moneyPath]: { $gte: amount }
        },
        {
          $inc: { [moneyPath]: -amount },
          $push: {
            'economy.transactions': {
              $each: [transaction],
              $slice: -100
            }
          }
        }
      );

      return !!updatedUser;
    } catch (error) {
      container.logger.error('Error removing money:', error);
      return false;
    }
  }

  static async transferMoney(userId: string, amount: number, from: 'wallet' | 'bank', to: 'wallet' | 'bank'): Promise<boolean> {
    try {
      if (amount <= 0) return false;
      if (from === to) return true;

      if (from === 'wallet' && to === 'bank') {
        const updatedUser = await User.findOneAndUpdate(
          {
            userId,
            'economy.wallet': { $gte: amount }
          },
          [
            {
              $set: {
                _availableBankSpace: {
                  $max: [
                    0,
                    {
                      $subtract: [
                        { $ifNull: ['$economy.bankLimit', 10000] },
                        { $ifNull: ['$economy.bank', 0] }
                      ]
                    }
                  ]
                }
              }
            },
            {
              $set: {
                _transferAmount: {
                  $min: [amount, '$_availableBankSpace']
                }
              }
            },
            {
              $set: {
                _overflowAmount: {
                  $subtract: [amount, '$_transferAmount']
                }
              }
            },
            {
              $set: {
                'economy.wallet': {
                  $add: [
                    { $subtract: [{ $ifNull: ['$economy.wallet', 0] }, amount] },
                    '$_overflowAmount'
                  ]
                },
                'economy.bank': {
                  $add: [{ $ifNull: ['$economy.bank', 0] }, '$_transferAmount']
                }
              }
            },
            {
              $unset: ['_availableBankSpace', '_transferAmount', '_overflowAmount']
            }
          ]
        );

        return !!updatedUser;
      }

      const updatedUser = await User.findOneAndUpdate(
        {
          userId,
          'economy.bank': { $gte: amount }
        },
        {
          $inc: {
            'economy.bank': -amount,
            'economy.wallet': amount
          }
        }
      );

      return !!updatedUser;
    } catch (error) {
      container.logger.error('Error transferring money:', error);
      return false;
    }
  }
}
