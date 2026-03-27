`timescale 1ns / 1ps
module led_blinker_tb_mult_rst;
    reg clk;
    reg reset;
    wire led;

    led_blinker uut ( .clk(clk), .reset(reset), .led(led) );

    initial begin
        clk = 0; forever #5 clk = ~clk;
    end

    initial begin
        reset = 1; #10 reset = 0;
        #50 reset = 1; #5 reset = 0;
        #50 reset = 1; #5 reset = 0;
        #50 reset = 1; #5 reset = 0;
        #100 $finish;
    end
endmodule
