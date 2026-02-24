import { Op } from 'sequelize';
import { SupportTicket, Manuscript, Admin } from '../database/models/index.js';

export const getSupportTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findByPk(id, {
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

    if (!ticket)
      return res.status(404).json({ message: 'Ticket not found' });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};