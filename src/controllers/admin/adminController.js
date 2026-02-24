// controllers/admin/adminController.js
import { Op } from 'sequelize';
import { SupportTicket, Manuscript, Admin, User } from '../../database/models/index.js';

export const getAllSupportTickets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {};

    if (status) where.status = status;

    const { rows, count } = await SupportTicket.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Manuscript,
          as: 'manuscript',
        },
        {
          model: Admin,
          as: 'admin',
        },
      ],
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSupportTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      status,
      admin_response,
    } = req.body;

    const adminId = req.user?.id || req.body.admin_id;

    const ticket = await SupportTicket.findByPk(id);

    if (!ticket)
      return res.status(404).json({ message: 'Ticket not found' });

    ticket.admin_id = adminId;

    if (status)
      ticket.status = status;

    if (admin_response)
      ticket.admin_response = admin_response;

    if (status === 'closed')
      ticket.resolved_at = new Date();

    await ticket.save();

    res.json({
      message: 'Support ticket updated',
      ticket,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already deactivated
    if (!user.is_active) {
      return res.status(400).json({ message: 'User is already deactivated' });
    }

    // Prevent Admin from deactivating themselves (safety check)
    if (user.id === req.user?.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own admin account' });
    }

    // Update status fields
    user.is_active = false;
    user.deactivated_at = new Date();
    user.deactivated_reason = reason || 'No reason provided by administrator';

    await user.save();

    res.json({
      message: 'User account has been deactivated successfully',
      data: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
        deactivated_at: user.deactivated_at
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Optional: Reactive User function
export const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.is_active = true;
    user.deactivated_at = null;
    user.deactivated_reason = null;

    await user.save();

    res.json({ message: 'User account reactivated', user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

