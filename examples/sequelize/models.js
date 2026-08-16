// Sample Sequelize ORM Models
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

const Department = sequelize.define('Department', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    budget: { type: DataTypes.FLOAT, defaultValue: 0.0 }
});

const Employee = sequelize.define('Employee', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    departmentId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Department',
            key: 'id'
        }
    },
    salary: DataTypes.INTEGER
});

const Project = sequelize.define('Project', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    leadEmployeeId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Employee',
            key: 'id'
        }
    }
});

Department.hasMany(Employee, { foreignKey: 'departmentId' });
Employee.belongsTo(Department, { foreignKey: 'departmentId' });

module.exports = { Department, Employee, Project };
