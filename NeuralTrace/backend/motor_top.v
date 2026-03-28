module motor_top(
	input wire clk,
	input wire rst,
	input wire [1:0] speed_sel,
	input wire dir_sel,
	input wire enable_sw,
	output wire pwm_out,
	output wire in1,
	output wire in2,
	output wire motor_en
);
	wire [7:0] duty;
	wire raw_pwm;


	direction_controller u_direction_controller(
		.dir_sel(dir_sel),
		.in1(in1),
		.in2(in2)
	);

	enable_controller u_enable_controller(
		.enable_sw(enable_sw),
		.motor_en(motor_en)
	);

	pwm_generator #(
		.WIDTH(8),
		.CLK_DIV(20)
	) u_pwm_generator(
		.clk(clk),
		.rst(rst),
		.duty(duty),
		.pwm_out(raw_pwm)
	);

	assign pwm_out = motor_en ? raw_pwm : 1'b0;
endmodule